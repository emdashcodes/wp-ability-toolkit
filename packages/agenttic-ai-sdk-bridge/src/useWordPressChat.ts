/**
 * React hook for WordPress REST API chat functionality
 * Matches the useAgentChat interface from @automattic/agenttic-client
 *
 * FULLY REFACTORED VERSION using extracted hooks
 * Cache bust: streaming tool call deltas with visual indicators
 */

import { useState, useCallback, useEffect } from '@wordpress/element';
import { getAllClientAbilities } from './toolRegistry.js';
import { debug } from './debug.js';
import { useConversationStorage } from './hooks/useConversationStorage.js';
import { useMessageConverter } from './hooks/useMessageConverter.js';
import { useAbortController } from './hooks/useAbortController.js';
import { useStreamingRequest } from './hooks/useStreamingRequest.js';
import { useToolCallHandler } from './hooks/useToolCallHandler.js';
import type {
	UIMessage,
	Suggestion,
	MessageActionsRegistration,
	UseWordPressChatConfig,
	UseWordPressChatReturn,
	WordPressMessage,
	ClientAbility,
} from './types.js';

/**
 * Creates a streaming message updater function
 * @param setMessages - State setter for messages array
 * @returns Tuple of [updateFunction, getStreamingId]
 */
function createStreamingMessageUpdater(
	setMessages: (
		value: UIMessage[] | ((prev: UIMessage[]) => UIMessage[])
	) => void
): [(content: string) => void, () => string | null] {
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
								content: [{ type: 'text', text: content }],
							}
						: msg
				)
			);
		}
	};

	const getStreamingId = () => streamingMessageId;

	return [updateStreamingMessage, getStreamingId];
}

export function useWordPressChat(
	config: UseWordPressChatConfig
): UseWordPressChatReturn {
	const {
		endpoint,
		nonce,
		timeout = 120000,
		enableStreaming = true,
		conversationStorageKey,
	} = config;

	// Use conversation storage hook for messages and processing state
	const { messages, setMessages, isProcessing, setIsProcessing } =
		useConversationStorage(conversationStorageKey);

	// Additional state
	const [error, setError] = useState<string | null>(null);
	const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
	const [_messageActionsRegistrations, setMessageActionsRegistrations] =
		useState<MessageActionsRegistration[]>([]);
	const [clientAbilities, setClientAbilities] = useState<ClientAbility[]>([]);

	// Use extracted hooks
	const {
		createAbortController,
		abort: abortRequest,
		getSignal,
	} = useAbortController();
	const { makeRequest } = useStreamingRequest();
	const { handleServerToolCall, handleClientToolCall, handleToolCallDelta } =
		useToolCallHandler(setMessages);
	const { toWordPressMessages } = useMessageConverter();

	// Load client abilities on mount
	useEffect(() => {
		async function loadAbilities() {
			const abilities = await getAllClientAbilities();
			setClientAbilities(abilities);
		}
		loadAbilities();
	}, []);

	// Submit message handler - FULLY REFACTORED
	const onSubmit = useCallback(
		async (message: string) => {
			// Create and add user message
			const userMessage: UIMessage = {
				id: `user-${Date.now()}`,
				role: 'user',
				content: [{ type: 'text', text: message }],
				timestamp: Date.now(),
				archived: false,
				showIcon: false,
			};

			setMessages((prev) => [...prev, userMessage]);
			setIsProcessing(true);
			setError(null);

			// Create abort controller with timeout
			const cleanupTimeout = createAbortController(timeout);

			try {
				// Prepare request payload
				const allMessages = [...messages, userMessage];
				const wpMessages = toWordPressMessages(allMessages);
				const payload = {
					messages: wpMessages,
					clientAbilities,
					clientContext: { url: window.location.href },
				};

				// Track state for tool call continuation
				let assistantMessageWithToolCalls: WordPressMessage | null =
					null;
				let currentCompletionId: string | null = null;

				// Create streaming message updater
				const [updateStreamingMessage, getStreamingId] =
					createStreamingMessageUpdater(setMessages);

				// Make streaming request
				await makeRequest(
					{
						endpoint,
						nonce,
						signal: getSignal(),
						enableStreaming,
					},
					payload,
					updateStreamingMessage,
					async (chunk) => {
						// Log all chunks
						if (chunk.tool_call_delta) {
							console.log('[CHUNK] tool_call_delta', chunk.tool_call_delta);
						}

						// Detect new completion (reset streaming message)
						if (chunk.id && chunk.id !== currentCompletionId) {
							debug('[WordPress Chat] New completion:', chunk.id);
							currentCompletionId = chunk.id;
							// Reset streaming message by removing old one
							const id = getStreamingId();
							if (id) {
								setMessages((prev) =>
									prev.filter((msg) => msg.id !== id)
								);
							}
						}

						// Capture assistant message with tool_calls
						if (chunk.assistant_message) {
							assistantMessageWithToolCalls =
								chunk.assistant_message;
							debug(
								'[WordPress Chat] Captured assistant message with tool calls'
							);
						}

						// Handle tool call delta (streaming arguments)
						if (chunk.tool_call_delta) {
							console.log('[CALLING] handleToolCallDelta');
							handleToolCallDelta(chunk.tool_call_delta);
							return; // Continue to next chunk
						}

						// Handle server tool call
						if (chunk.server_tool_call) {
							handleServerToolCall(chunk.server_tool_call);
							return; // Continue to next chunk
						}

						// Handle client tool call
						if (chunk.client_tool_call) {
							const toolCall = chunk.client_tool_call;

							// Execute client tool
							const {
								message: toolResultMessage,
								skipContinuation,
							} = await handleClientToolCall(toolCall);

							// Check if tool wants to skip continuation (e.g., navigate)
							if (skipContinuation) {
								debug(
									'[WordPress Chat] Tool requested skip continuation'
								);
								// Store for post-navigation continuation
								const storeFunc = (window as any)
									.__wpAbilityToolkit_storeNavigationContinuation;
								if (typeof storeFunc === 'function') {
									storeFunc(
										assistantMessageWithToolCalls,
										toolResultMessage
									);
								}
								return; // Exit stream - navigation will reload
							}

							// Continue conversation with tool result
							const continuationMessages =
								assistantMessageWithToolCalls
									? [
											...wpMessages,
											assistantMessageWithToolCalls,
											toolResultMessage,
										]
									: [...wpMessages, toolResultMessage];

							debug(
								'[WordPress Chat] Continuing with tool result'
							);

							// Make continuation request
							const [updateContinueMessage] =
								createStreamingMessageUpdater(setMessages);

							await makeRequest(
								{
									endpoint,
									nonce,
									signal: getSignal(),
									enableStreaming,
								},
								{
									messages: continuationMessages,
									clientAbilities,
									clientContext: {
										url: window.location.href,
									},
								},
								updateContinueMessage
							);

							// Exit original stream after handling tool
							throw new Error('TOOL_CONTINUATION_HANDLED');
						}
					}
				);

				setIsProcessing(false);
			} catch (err) {
				// Handle special case: tool continuation completed successfully
				if (
					err instanceof Error &&
					err.message === 'TOOL_CONTINUATION_HANDLED'
				) {
					setIsProcessing(false);
					return;
				}

				// Handle abort
				if (err instanceof Error && err.name === 'AbortError') {
					debug('Request was aborted by user');
					setIsProcessing(false);
					return;
				}

				// Handle real errors
				const errorMessage =
					err instanceof Error
						? err.message
						: 'Failed to send message';
				setError(errorMessage);
				setIsProcessing(false);
				throw err;
			} finally {
				cleanupTimeout();
			}
		},
		[
			endpoint,
			nonce,
			messages,
			clientAbilities,
			timeout,
			enableStreaming,
			createAbortController,
			getSignal,
			makeRequest,
			handleServerToolCall,
			handleClientToolCall,
			handleToolCallDelta,
			toWordPressMessages,
			setMessages,
			setIsProcessing,
			setError,
		]
	);

	// Continue with stored tool result (for post-navigation continuation) - FULLY REFACTORED
	const continueWithToolResult = useCallback(
		async (
			assistantMessage: WordPressMessage,
			toolResult: WordPressMessage
		) => {
			setIsProcessing(true);
			setError(null);

			const cleanupTimeout = createAbortController(timeout);

			try {
				// Build continuation messages
				const wpMessages = toWordPressMessages(messages);
				const continuationMessages = [
					...wpMessages,
					assistantMessage,
					toolResult,
				];

				// Create streaming message updater
				const [updateStreamingMessage] =
					createStreamingMessageUpdater(setMessages);

				// Make streaming request
				await makeRequest(
					{
						endpoint,
						nonce,
						signal: getSignal(),
						enableStreaming,
					},
					{
						messages: continuationMessages,
						clientAbilities,
						clientContext: { url: window.location.href },
					},
					updateStreamingMessage
				);

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
				cleanupTimeout();
			}
		},
		[
			endpoint,
			nonce,
			messages,
			clientAbilities,
			timeout,
			enableStreaming,
			createAbortController,
			getSignal,
			makeRequest,
			toWordPressMessages,
			setMessages,
			setIsProcessing,
			setError,
		]
	);

	// Simple utility functions
	const addMessage = useCallback(
		(message: UIMessage) => {
			setMessages((prev) => [...prev, message]);
		},
		[setMessages]
	);

	const registerSuggestions = useCallback((newSuggestions: Suggestion[]) => {
		setSuggestions(newSuggestions);
	}, []);

	const clearSuggestions = useCallback(() => {
		setSuggestions([]);
	}, []);

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

	const abortCurrentRequest = useCallback(() => {
		abortRequest();
	}, [abortRequest]);

	const clearConversation = useCallback(() => {
		setMessages([]);
		setError(null);
		setSuggestions([]);
		if (conversationStorageKey) {
			localStorage.removeItem(conversationStorageKey);
		}
	}, [conversationStorageKey, setMessages]);

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
		messageActionsRegistrations: _messageActionsRegistrations,
		addMessage,
		abortCurrentRequest,
		clearConversation,
	};
}
