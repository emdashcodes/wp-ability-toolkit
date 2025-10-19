/**
 * Hook for handling tool calls (both client-side and server-side)
 * Unified management of tool rendering, execution, and status updates
 */

import { createElement, useCallback } from '@wordpress/element';
import { executeToolCall } from '../toolRegistry.js';
import { formatToolContent } from '../utils/toolFormatter.js';
import { ToolCall } from '../components/ToolCall.js';
import { debug } from '../debug.js';
import type { UIMessage, ToolCallContent, WordPressMessage } from '../types.js';
import type { ToolCallEvent, ServerToolCallEvent } from '../streamAdapter.js';

export function useToolCallHandler(
	setMessages: (
		value: UIMessage[] | ((prev: UIMessage[]) => UIMessage[])
	) => void
) {
	/**
	 * Create a tool call UI message
	 */
	const createToolCallMessage = useCallback(
		(toolCallId: string, toolCallContent: ToolCallContent): UIMessage => {
			const ToolCallWrapper = (props: any) =>
				createElement(ToolCall, {
					toolCall: props.toolCall,
				});

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
			const ToolCallWrapper = (props: any) =>
				createElement(ToolCall, {
					toolCall: props.toolCall,
				});

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

			if (serverToolCall.status === 'pending') {
				// Create new pending tool call message
				const message = createToolCallMessage(
					serverToolCall.id,
					toolCallContent
				);
				setMessages((prev) => [...prev, message]);
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

			const message = createToolCallMessage(toolCall.id, toolCallContent);
			setMessages((prev) => [...prev, message]);

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
	};
}
