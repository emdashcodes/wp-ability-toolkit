/**
 * Hook for handling tool calls (both client-side and server-side)
 * Unified management of tool rendering, execution, and status updates
 */

import { createElement, useCallback, useRef } from '@wordpress/element';
import { executeToolCall } from '../toolRegistry.js';
import { formatToolContent } from '../utils/toolFormatter.js';
import { ToolCall } from '../components/ToolCall.js';
import { debug } from '../debug.js';
import type { UIMessage, ToolCallContent, WordPressMessage } from '../types.js';
import type {
	ToolCallEvent,
	ServerToolCallEvent,
	ToolCallDeltaEvent,
} from '../streamAdapter.js';

/**
 * Try to parse partial JSON and extract specific field
 */
function tryParsePartialJSON(jsonStr: string, field: string): any {
	try {
		// Try to parse complete JSON first
		const parsed = JSON.parse(jsonStr);
		return parsed[field];
	} catch {
		// If parsing fails, try to extract the field value manually
		// This handles incomplete JSON like: {"thought":"partial text
		const fieldPattern = new RegExp(
			`"${field}"\\s*:\\s*"([^"]*(?:\\\\.[^"]*)*)`,
			's'
		);
		const match = jsonStr.match(fieldPattern);
		if (match && match[1]) {
			// Unescape common escape sequences
			return match[1]
				.replace(/\\n/g, '\n')
				.replace(/\\t/g, '\t')
				.replace(/\\"/g, '"')
				.replace(/\\\\/g, '\\');
		}
		return null;
	}
}

// Stable wrapper component that never changes reference
// It receives the toolCall from componentProps
const ToolCallWrapper = (props: any) =>
	createElement(ToolCall, {
		toolCall: props.toolCall,
	});

export function useToolCallHandler(
	setMessages: (
		value: UIMessage[] | ((prev: UIMessage[]) => UIMessage[])
	) => void
) {
	// Track accumulated arguments for streaming tool calls
	const streamingToolArgs = useRef<Map<string, string>>(new Map());

	/**
	 * Create a tool call UI message
	 */
	const createToolCallMessage = useCallback(
		(toolCallId: string, toolCallContent: ToolCallContent): UIMessage => {
			return {
				id: `tool-call-${toolCallId}`,
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
		},
		[]
	);

	/**
	 * Update an existing tool call message
	 */
	const updateToolCallMessage = useCallback(
		(toolCallId: string, toolCallContent: ToolCallContent) => {
			const messageId = `tool-call-${toolCallId}`;

			setMessages((prev) =>
				prev.map((msg) =>
					msg.id === messageId
						? {
								...msg,
								content: [
									{
										type: 'component',
										component: ToolCallWrapper,
										componentProps: {
											toolCall: toolCallContent,
										},
									},
								],
							}
						: msg
				)
			);
		},
		[setMessages]
	);

	/**
	 * Handle streaming tool call delta
	 */
	const handleToolCallDelta = useCallback(
		(delta: ToolCallDeltaEvent) => {
			const { id, name, arguments_delta } = delta;

			console.log('[DELTA] Tool:', name, '| Args delta:', arguments_delta.substring(0, 50));

			if (name === 'wp-ability-toolkit/think') {
				console.log('[THINK DELTA RECEIVED]', arguments_delta);
			}

			// Accumulate arguments
			const currentArgs = streamingToolArgs.current.get(id) || '';
			const newArgs = currentArgs + arguments_delta;
			streamingToolArgs.current.set(id, newArgs);

			// Try to parse accumulated arguments to extract input
			// For think tool, we want to extract the "thought" field
			let parsedInput: any = {};
			if (name === 'wp-ability-toolkit/think') {
				const thought = tryParsePartialJSON(newArgs, 'thought');
				console.log(
					'[THOUGHT]',
					thought ? `${thought.length} chars` : 'null',
					'from',
					newArgs.length,
					'total'
				);
				if (thought !== null) {
					parsedInput = { thought };
				}
				debug(
					`[Tool Delta] Think - ${thought ? thought.length : 0} chars extracted from ${newArgs.length} total`
				);
			} else {
				// For other tools, try to parse the whole JSON
				try {
					parsedInput = JSON.parse(newArgs);
				} catch {
					// JSON incomplete, keep parsedInput as empty object
				}
			}

			const toolCallContent: ToolCallContent = {
				id,
				name,
				input: parsedInput,
				status: 'pending',
			};

			// Check if message already exists
			const messageId = `tool-call-${id}`;

			// Use setMessages to check existence and decide action
			let messageExists = false;
			setMessages((prev) => {
				messageExists = prev.some((msg) => msg.id === messageId);
				if (!messageExists) {
					// Create new message
					const message = createToolCallMessage(id, toolCallContent);
					return [...prev, message];
				}
				return prev;
			});

			// Update existing message if it exists
			if (messageExists) {
				console.log('[UPDATE] Updating tool call message', id);
				updateToolCallMessage(id, toolCallContent);
			} else {
				console.log('[CREATE] Created new tool call message', id);
			}
		},
		[createToolCallMessage, updateToolCallMessage, setMessages]
	);

	/**
	 * Handle server-side tool call (display only)
	 */
	const handleServerToolCall = useCallback(
		(serverToolCall: ServerToolCallEvent) => {
			const toolCallContent: ToolCallContent = {
				id: serverToolCall.id,
				name: serverToolCall.name,
				input: serverToolCall.input,
				status: serverToolCall.status,
				output: serverToolCall.output,
				error: serverToolCall.error,
			};

			const messageId = `tool-call-${serverToolCall.id}`;

			if (serverToolCall.status === 'pending') {
				// Check if message already exists (from streaming deltas)
				setMessages((prev) => {
					const exists = prev.some((msg) => msg.id === messageId);
					if (exists) {
						// Update existing message (from streaming)
						return prev.map((msg) =>
							msg.id === messageId
								? {
										...msg,
										content: [
											{
												type: 'component',
												component: (props: any) =>
													createElement(ToolCall, {
														toolCall: props.toolCall,
													}),
												componentProps: {
													toolCall: toolCallContent,
												},
											},
										],
									}
								: msg
						);
					} else {
						// Create new pending tool call message (no streaming occurred)
						const message = createToolCallMessage(
							serverToolCall.id,
							toolCallContent
						);
						return [...prev, message];
					}
				});
			} else {
				// Update existing message with result
				updateToolCallMessage(serverToolCall.id, toolCallContent);
			}
		},
		[createToolCallMessage, updateToolCallMessage, setMessages]
	);

	/**
	 * Handle client-side tool call (execute and display)
	 * Returns tool result for continuation and skip flag
	 */
	const handleClientToolCall = useCallback(
		async (
			toolCall: ToolCallEvent
		): Promise<{
			message: WordPressMessage;
			skipContinuation: boolean;
		}> => {
			// Create pending tool call message
			const toolCallContent: ToolCallContent = {
				id: toolCall.id,
				name: toolCall.name,
				input: toolCall.input,
				status: 'pending',
			};

			const messageId = `tool-call-${toolCall.id}`;

			// Check if message already exists (from streaming deltas)
			setMessages((prev) => {
				const exists = prev.some((msg) => msg.id === messageId);
				if (exists) {
					// Update existing message to pending status
					return prev.map((msg) =>
						msg.id === messageId
							? {
									...msg,
									content: [
										{
											type: 'component',
											component: ToolCallWrapper,
											componentProps: {
												toolCall: toolCallContent,
											},
										},
									],
								}
							: msg
					);
				} else {
					// Create new message
					const message = createToolCallMessage(
						toolCall.id,
						toolCallContent
					);
					return [...prev, message];
				}
			});

			// Execute the client-side tool
			const toolResult = await executeToolCall({
				id: toolCall.id,
				name: toolCall.name,
				input: toolCall.input,
			});

			debug('[Tool Handler] Tool result:', toolResult);

			// Update the tool call message with result
			const updatedToolCallContent: ToolCallContent = {
				id: toolCall.id,
				name: toolCall.name,
				input: toolCall.input,
				status: toolResult.error ? 'error' : 'success',
				output: toolResult.output,
				error: toolResult.error,
			};

			updateToolCallMessage(toolCall.id, updatedToolCallContent);

			// Format tool result for API
			const toolContent = formatToolContent(toolResult);

			const toolResultMessage: WordPressMessage = {
				role: 'tool',
				tool_call_id: toolCall.id,
				content: toolContent,
			};

			// Check if tool wants to skip continuation
			const skipContinuation = Boolean(
				toolResult.output &&
					typeof toolResult.output === 'object' &&
					'_skipContinuation' in toolResult.output &&
					(toolResult.output as { _skipContinuation?: boolean })
						._skipContinuation === true
			);

			return {
				message: toolResultMessage,
				skipContinuation,
			};
		},
		[createToolCallMessage, updateToolCallMessage, setMessages]
	);

	return {
		handleServerToolCall,
		handleClientToolCall,
		handleToolCallDelta,
	};
}
