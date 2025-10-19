/**
 * React hook for WordPress REST API chat functionality
 * Matches the useAgentChat interface from @automattic/agenttic-client
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { parseSSEStream } from './streamAdapter.js';
import { getAllClientAbilities, executeToolCall } from './toolRegistry.js';
import { DeltaAccumulator } from './deltaAccumulator.js';
import { loadConversation, saveConversation } from './conversationStorage.js';
import { debug } from './debug.js';
import { ToolCall } from './components/ToolCall.js';
import type {
	UIMessage,
	Suggestion,
	MessageActionsRegistration,
	UseWordPressChatConfig,
	UseWordPressChatReturn,
	WordPressMessage,
	ClientAbility,
	ToolCallContent,
} from './types.js';

export function useWordPressChat(
	config: UseWordPressChatConfig
): UseWordPressChatReturn {
	const {
		endpoint,
		nonce,
		timeout = 120000, // Default: 2 minutes
		enableStreaming = true,
		conversationStorageKey,
	} = config;

	// State - use lazy initializer to load conversation before first render
	const [messages, setMessages] = useState<UIMessage[]>(() => {
		if (conversationStorageKey) {
			const savedMessages = loadConversation(conversationStorageKey);
			if (savedMessages && savedMessages.length > 0) {
				debug(
					'[WordPress Chat] Restored conversation from localStorage:',
					savedMessages.length,
					'messages'
				);
				return savedMessages;
			}
		}
		return [];
	});
	const [isProcessing, setIsProcessing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
	const [_messageActionsRegistrations, setMessageActionsRegistrations] =
		useState<MessageActionsRegistration[]>([]);
	const [clientAbilities, setClientAbilities] = useState<ClientAbility[]>([]);

	// Abort controller ref
	const abortControllerRef = useRef<AbortController | null>(null);

	// Load client abilities on mount
	useEffect(() => {
		async function loadAbilities() {
			const abilities = await getAllClientAbilities();
			setClientAbilities(abilities);
		}
		loadAbilities();
	}, []);

	// Save conversation to localStorage when messages change
	// Only save when not processing (i.e., when streaming is complete)
	useEffect(() => {
		if (conversationStorageKey && messages.length > 0 && !isProcessing) {
			debug(
				'[WordPress Chat] Saving conversation to localStorage:',
				messages.length,
				'messages'
			);
			saveConversation(conversationStorageKey, messages);
		}
	}, [messages, conversationStorageKey, isProcessing]);

	// If conversationStorageKey changes after mount, reload from new key
	const previousStorageKey = useRef<string | undefined>(
		conversationStorageKey
	);
	useEffect(() => {
		if (
			conversationStorageKey &&
			conversationStorageKey !== previousStorageKey.current
		) {
			previousStorageKey.current = conversationStorageKey;
			const savedMessages = loadConversation(conversationStorageKey);
			if (savedMessages && savedMessages.length > 0) {
				debug(
					'[WordPress Chat] Reloaded conversation from new key:',
					savedMessages.length,
					'messages'
				);
				setMessages(savedMessages);
			} else {
				// New key with no saved messages, clear current conversation
				setMessages([]);
			}
		}
	}, [conversationStorageKey]);

	// Convert UI messages to WordPress format
	const toWordPressMessages = (
		uiMessages: UIMessage[]
	): WordPressMessage[] => {
		return uiMessages.map((msg) => ({
			role: msg.role === 'agent' ? 'assistant' : 'user',
			content: msg.content
				.filter((c) => c.type === 'text')
				.map((c) => c.text || '')
				.join('\n'),
		}));
	};

	// Submit message handler
	const onSubmit = useCallback(
		async (message: string) => {
			// Create user message immediately
			const userMessage: UIMessage = {
				id: `user-${Date.now()}`,
				role: 'user',
				content: [{ type: 'text', text: message }],
				timestamp: Date.now(),
				archived: false,
				showIcon: false,
			};

			// Add user message and set processing state
			setMessages((prev) => [...prev, userMessage]);
			setIsProcessing(true);
			setError(null);

			// Create abort controller with timeout
			abortControllerRef.current = new AbortController();
			const timeoutId = setTimeout(() => {
				abortControllerRef.current?.abort(new Error('Request timeout'));
			}, timeout);

			try {
				// Prepare request
				const allMessages = [...messages, userMessage];
				const wpMessages = toWordPressMessages(allMessages);

				// Prepare client context
				const clientContext = {
					url: window.location.href,
				};

				// Make request to WordPress REST API
				const response = await fetch(endpoint, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'X-WP-Nonce': nonce,
					},
					body: JSON.stringify({
						messages: wpMessages,
						clientAbilities,
						clientContext,
					}),
					signal: abortControllerRef.current.signal,
				});

				if (!response.ok) {
					// Try to parse error message from response body
					let errorMessage = `HTTP error! status: ${response.status}`;
					try {
						const errorData = await response.json();
						if (errorData.error) {
							// Handle structured error objects (OpenAI/Anthropic format)
							if (
								typeof errorData.error === 'object' &&
								errorData.error.message
							) {
								errorMessage = errorData.error.message;
							} else if (typeof errorData.error === 'string') {
								// Handle simple string errors
								errorMessage = errorData.error;
							}
						} else if (errorData.message) {
							// Handle WordPress REST API format
							errorMessage = errorData.message;
						}
					} catch (parseError) {
						// If we can't parse the error, use the status-based message
						console.warn(
							'Could not parse error response:',
							parseError
						);
					}
					throw new Error(errorMessage);
				}

				// Handle streaming response
				let streamingMessageId: string | null = null;
				let currentCompletionId: string | null = null; // Track completion ID to detect new responses
				let assistantMessageWithToolCalls: WordPressMessage | null =
					null;

				// Create delta accumulator for smooth streaming updates
				let deltaAccumulator: DeltaAccumulator | null = null;

				const updateStreamingMessage = (content: string) => {
					if (!streamingMessageId) {
						streamingMessageId = `agent-streaming-${Date.now()}`;
						const streamingMessage: UIMessage = {
							id: streamingMessageId,
							role: 'agent',
							content: [{ type: 'text', text: content }],
							timestamp: Date.now(),
							archived: false,
							showIcon: true,
							icon: 'assistant',
						};
						setMessages((prev) => [...prev, streamingMessage]);
					} else {
						setMessages((prev) =>
							prev.map((msg) =>
								msg.id === streamingMessageId
									? {
											...msg,
											content: [
												{ type: 'text', text: content },
											],
										}
									: msg
							)
						);
					}
				};

				deltaAccumulator = new DeltaAccumulator({
					onUpdate: updateStreamingMessage,
					usePacing: enableStreaming,
				});

				for await (const chunk of parseSSEStream(response)) {
					// Handle error events from SSE stream
					if (chunk.error) {
						throw new Error(chunk.error);
					}

					// Detect new completion and reset accumulator/message
					if (chunk.id && chunk.id !== currentCompletionId) {
						debug(
							'[WordPress Chat] New completion detected:',
							chunk.id,
							'previous:',
							currentCompletionId
						);
						currentCompletionId = chunk.id;
						streamingMessageId = null;
						deltaAccumulator?.clear();
						deltaAccumulator = new DeltaAccumulator({
							onUpdate: updateStreamingMessage,
							usePacing: enableStreaming,
						});
					}
					// Capture assistant message with tool_calls
					if (chunk.assistant_message) {
						assistantMessageWithToolCalls = chunk.assistant_message;
						debug(
							'[WordPress Chat] Captured assistant message with tool calls:',
							assistantMessageWithToolCalls
						);
					}

					// Handle server-side tool call (just display, no execution needed)
					if (chunk.server_tool_call) {
						const serverToolCall = chunk.server_tool_call;
						const toolCallMessageId = `tool-call-${serverToolCall.id}`;

						if (serverToolCall.status === 'pending') {
							// Create pending tool call message
							const toolCallContent: ToolCallContent = {
								id: serverToolCall.id,
								name: serverToolCall.name,
								input: serverToolCall.input,
								status: 'pending',
							};

							const ToolCallWrapper = (props: any) =>
								React.createElement(ToolCall, {
									toolCall: props.toolCall,
								});

							const toolCallMessage: UIMessage = {
								id: toolCallMessageId,
								role: 'agent',
								content: [
									{
										type: 'component',
										component: ToolCallWrapper,
										componentProps: {
											toolCall: toolCallContent,
										},
									},
								],
								timestamp: Date.now(),
								archived: false,
								showIcon: true,
								icon: 'assistant',
							};

							// Add tool message to end (chronological order)
							setMessages((prev) => [...prev, toolCallMessage]);
						} else {
							// Update with success/error status
							const updatedToolCallContent: ToolCallContent = {
								id: serverToolCall.id,
								name: serverToolCall.name,
								input: serverToolCall.input,
								status: serverToolCall.status,
								output: serverToolCall.output,
								error: serverToolCall.error,
							};

							const UpdatedToolCallWrapper = (props: any) =>
								React.createElement(ToolCall, {
									toolCall: props.toolCall,
								});

							setMessages((prev) =>
								prev.map((msg) =>
									msg.id === toolCallMessageId
										? {
												...msg,
												content: [
													{
														type: 'component',
														component:
															UpdatedToolCallWrapper,
														componentProps: {
															toolCall:
																updatedToolCallContent,
														},
													},
												],
											}
										: msg
								)
							);
						}

						// Continue to next chunk (server tools don't interrupt the stream)
						continue;
					}

					// Handle client tool call
					if (chunk.client_tool_call) {
						const toolCall = chunk.client_tool_call;

						// Create a tool call content object for UI display
						const toolCallContent: ToolCallContent = {
							id: toolCall.id,
							name: toolCall.name,
							input: toolCall.input,
							status: 'pending',
						};

						// Create a wrapper component that passes props from componentProps
						const ToolCallWrapper = (props: any) =>
							React.createElement(ToolCall, {
								toolCall: props.toolCall,
							});

						// Create a message to show the pending tool call
						const toolCallMessageId = `tool-call-${toolCall.id}`;
						const toolCallMessage: UIMessage = {
							id: toolCallMessageId,
							role: 'agent',
							content: [
								{
									type: 'component',
									component: ToolCallWrapper,
									componentProps: {
										toolCall: toolCallContent,
									},
								},
							],
							timestamp: Date.now(),
							archived: false,
							showIcon: true,
							icon: 'assistant',
						};

						// Add the pending tool call message to the UI
						setMessages((prev) => [...prev, toolCallMessage]);

						// Execute the client-side tool
						const toolResult = await executeToolCall({
							id: toolCall.id,
							name: toolCall.name,
							input: toolCall.input,
						});

						debug(
							'[WordPress Chat] Tool result:',
							toolResult
						);
						debug(
							'[WordPress Chat] Tool result.output:',
							toolResult.output
						);
						debug(
							'[WordPress Chat] Has _skipContinuation?',
							toolResult.output?._skipContinuation
						);

						// Update the tool call message with the result
						const updatedToolCallContent: ToolCallContent = {
							id: toolCall.id,
							name: toolCall.name,
							input: toolCall.input,
							status: toolResult.error ? 'error' : 'success',
							output: toolResult.output,
							error: toolResult.error,
						};

						// Update with a new wrapper component for the updated tool call
						const UpdatedToolCallWrapper = (props: any) =>
							React.createElement(ToolCall, {
								toolCall: props.toolCall,
							});

						setMessages((prev) =>
							prev.map((msg) =>
								msg.id === toolCallMessageId
									? {
											...msg,
											content: [
												{
													type: 'component',
													component:
														UpdatedToolCallWrapper,
													componentProps: {
														toolCall:
															updatedToolCallContent,
													},
												},
											],
										}
									: msg
							)
						);

						// Check if tool wants to skip continuation (e.g., navigate before reload)
						const shouldSkipContinuation =
							toolResult.output &&
							toolResult.output._skipContinuation;

						// Add tool result to messages (OpenAI format)
						// If the tool result contains an error field, format it prominently
						let toolContent;
						if (
							toolResult.output &&
							typeof toolResult.output === 'object' &&
							'error' in toolResult.output
						) {
							toolContent = `ERROR: ${toolResult.output.error}\n\n${JSON.stringify(toolResult.output, null, 2)}`;
						} else if (toolResult.error) {
							toolContent = `ERROR: ${toolResult.error}`;
						} else {
							toolContent = JSON.stringify(toolResult.output);
						}

						const toolResultMessage: WordPressMessage = {
							role: 'tool',
							tool_call_id: toolCall.id,
							content: toolContent,
						};

						// If tool wants to skip continuation, store data and exit
						if (shouldSkipContinuation) {
							debug(
								'[WordPress Chat] Tool requested skip continuation, storing for post-navigation'
							);
							debug(
								'[WordPress Chat] Assistant message:',
								assistantMessageWithToolCalls
							);
							debug(
								'[WordPress Chat] Tool result:',
								toolResultMessage
							);

							// Store continuation data using global function if available
							const storeFunc = (window as any)
								.__wpAbilityToolkit_storeNavigationContinuation;
							debug(
								'[WordPress Chat] Store function available?',
								typeof storeFunc
							);

							if (typeof storeFunc === 'function') {
								debug(
									'[WordPress Chat] Calling store function...'
								);
								storeFunc(
									assistantMessageWithToolCalls,
									toolResultMessage
								);
								debug(
									'[WordPress Chat] Store function called successfully'
								);
							} else {
								console.error(
									'[WordPress Chat] Store function not available!'
								);
							}

							// Exit stream - navigation will reload the page
							break;
						}

						// Continue conversation with assistant message + tool result
						// Must include the assistant's tool_calls message before the tool result
						// Build messages array: previous messages + assistant with tool_calls + tool result
						const continuationMessages =
							assistantMessageWithToolCalls
								? [
										...wpMessages,
										assistantMessageWithToolCalls,
										toolResultMessage,
									]
								: [...wpMessages, toolResultMessage];

						debug(
							'[WordPress Chat] Continuing with tool result:',
							toolResultMessage
						);
						debug(
							'[WordPress Chat] Continuation messages:',
							continuationMessages
						);

						const continueResponse = await fetch(endpoint, {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
								'X-WP-Nonce': nonce,
							},
							body: JSON.stringify({
								messages: continuationMessages,
								clientAbilities,
								clientContext,
							}),
							signal: abortControllerRef.current.signal,
						});

						debug(
							'[WordPress Chat] Continue response status:',
							continueResponse.status
						);

						if (!continueResponse.ok) {
							const errorText = await continueResponse.text();
							console.error(
								'[WordPress Chat] Continue response failed:',
								errorText
							);
							throw new Error(
								`Continue request failed: ${continueResponse.status}`
							);
						}

						// Process the continued response
						// Reset accumulator for the continuation
						deltaAccumulator?.clear();
						deltaAccumulator = new DeltaAccumulator({
							onUpdate: updateStreamingMessage,
							usePacing: enableStreaming,
						});

						for await (const continueChunk of parseSSEStream(
							continueResponse
						)) {
							// Handle error events from SSE stream
							if (continueChunk.error) {
								throw new Error(continueChunk.error);
							}

							// Add chunk to accumulator
							if (continueChunk.delta || continueChunk.content) {
								deltaAccumulator.addChunk(continueChunk);
							}

							if (continueChunk.done) {
								deltaAccumulator.flush();
								break;
							}
						}

						break; // Exit original stream
					}

					// Add chunk to accumulator
					if (chunk.delta || chunk.content) {
						deltaAccumulator.addChunk(chunk);
					}

					// Check if done
					if (chunk.done) {
						deltaAccumulator.flush();
						break;
					}
				}

				// Flush any remaining content
				deltaAccumulator?.flush();

				setIsProcessing(false);
			} catch (err) {
				// Handle AbortError specially
				if (err instanceof Error && err.name === 'AbortError') {
					debug('Request was aborted by user');
					setIsProcessing(false);
					return;
				}

				const errorMessage =
					err instanceof Error
						? err.message
						: 'Failed to send message';
				setError(errorMessage);
				setIsProcessing(false);
				throw err;
			} finally {
				clearTimeout(timeoutId);
				abortControllerRef.current = null;
			}
		},
		[endpoint, nonce, messages, clientAbilities, timeout, enableStreaming]
	);

	// Add message function
	const addMessage = useCallback((message: UIMessage) => {
		setMessages((prev) => [...prev, message]);
	}, []);

	// Suggestions management
	const registerSuggestions = useCallback((newSuggestions: Suggestion[]) => {
		setSuggestions(newSuggestions);
	}, []);

	const clearSuggestions = useCallback(() => {
		setSuggestions([]);
	}, []);

	// Message actions management
	const registerMessageActions = useCallback(
		(registration: MessageActionsRegistration) => {
			setMessageActionsRegistrations((prev) => [...prev, registration]);
		},
		[]
	);

	const unregisterMessageActions = useCallback((id: string) => {
		setMessageActionsRegistrations((prev) =>
			prev.filter((reg) => reg.id !== id)
		);
	}, []);

	const clearAllMessageActions = useCallback(() => {
		setMessageActionsRegistrations([]);
	}, []);

	// Abort current request
	const abortCurrentRequest = useCallback(() => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
			abortControllerRef.current = null;
		}
	}, []);

	// Continue with stored tool result (for post-navigation continuation)
	const continueWithToolResult = useCallback(
		async (
			assistantMessage: WordPressMessage,
			toolResult: WordPressMessage
		) => {
			debug('[WordPress Chat] ===== CONTINUATION START =====');
			debug(
				'[WordPress Chat] Current messages in state:',
				messages.length
			);
			debug(
				'[WordPress Chat] Assistant message to add:',
				assistantMessage
			);
			debug('[WordPress Chat] Tool result to add:', toolResult);

			setIsProcessing(true);
			setError(null);

			// Create abort controller with timeout
			abortControllerRef.current = new AbortController();
			const timeoutId = setTimeout(() => {
				abortControllerRef.current?.abort(new Error('Request timeout'));
			}, timeout);

			try {
				// Build continuation messages from current state + assistant + tool result
				const wpMessages = toWordPressMessages(messages);
				const continuationMessages = [
					...wpMessages,
					assistantMessage,
					toolResult,
				];

				debug(
					'[WordPress Chat] Converted UI messages to WordPress format:',
					wpMessages
				);
				debug(
					'[WordPress Chat] Final continuation messages array:',
					continuationMessages
				);
				debug(
					'[WordPress Chat] Sending continuation request to:',
					endpoint
				);

				// Prepare client context
				const clientContext = {
					url: window.location.href,
				};

				// Make request to WordPress REST API
				const response = await fetch(endpoint, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'X-WP-Nonce': nonce,
					},
					body: JSON.stringify({
						messages: continuationMessages,
						clientAbilities,
						clientContext,
					}),
					signal: abortControllerRef.current.signal,
				});

				if (!response.ok) {
					console.error(
						'[WordPress Chat] Continuation request failed:',
						response.status,
						response.statusText
					);
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				debug(
					'[WordPress Chat] Continuation request successful, processing stream...'
				);

				// Handle streaming response
				let streamingMessageId: string | null = null;

				const updateStreamingMessage = (content: string) => {
					if (!streamingMessageId) {
						streamingMessageId = `agent-streaming-${Date.now()}`;
						const streamingMessage: UIMessage = {
							id: streamingMessageId,
							role: 'agent',
							content: [{ type: 'text', text: content }],
							timestamp: Date.now(),
							archived: false,
							showIcon: true,
							icon: 'assistant',
						};
						setMessages((prev) => [...prev, streamingMessage]);
					} else {
						setMessages((prev) =>
							prev.map((msg) =>
								msg.id === streamingMessageId
									? {
											...msg,
											content: [
												{ type: 'text', text: content },
											],
										}
									: msg
							)
						);
					}
				};

				const deltaAccumulator = new DeltaAccumulator({
					onUpdate: updateStreamingMessage,
					usePacing: enableStreaming,
				});

				for await (const chunk of parseSSEStream(response)) {
					// Handle error events from SSE stream
					if (chunk.error) {
						throw new Error(chunk.error);
					}

					if (chunk.delta || chunk.content) {
						deltaAccumulator.addChunk(chunk);
					}

					if (chunk.done) {
						deltaAccumulator.flush();
						break;
					}
				}

				deltaAccumulator.flush();
				debug(
					'[WordPress Chat] ===== CONTINUATION COMPLETE ====='
				);
				debug(
					'[WordPress Chat] Total messages now:',
					messages.length + 1
				); // +1 for the new assistant message
				setIsProcessing(false);
			} catch (err) {
				if (err instanceof Error && err.name === 'AbortError') {
					debug('Request was aborted by user');
					setIsProcessing(false);
					return;
				}

				const errorMessage =
					err instanceof Error
						? err.message
						: 'Failed to continue conversation';
				setError(errorMessage);
				setIsProcessing(false);
				throw err;
			} finally {
				clearTimeout(timeoutId);
				abortControllerRef.current = null;
			}
		},
		[endpoint, nonce, messages, clientAbilities, timeout, enableStreaming]
	);

	return {
		messages,
		isProcessing,
		error,
		onSubmit,
		continueWithToolResult,
		suggestions,
		registerSuggestions,
		clearSuggestions,
		registerMessageActions,
		unregisterMessageActions,
		clearAllMessageActions,
		addMessage,
		abortCurrentRequest,
	};
}
