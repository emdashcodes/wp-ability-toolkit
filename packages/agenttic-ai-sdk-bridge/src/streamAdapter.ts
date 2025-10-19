/**
 * Adapts WordPress REST API streaming responses to Agenttic UI format
 */

import type { AbilityInput, AbilityOutput } from '@wordpress/abilities';
import type { OpenAIToolCall } from './types.js';

export interface ToolCallEvent {
	id: string;
	name: string;
	input: AbilityInput;
}

export interface ServerToolCallEvent {
	id: string;
	name: string;
	input: AbilityInput;
	status: 'pending' | 'success' | 'error';
	output?: AbilityOutput;
	error?: string;
}

export interface StreamChunk {
	id?: string;
	role?: 'assistant';
	content?: string;
	delta?: string | { content?: string; [key: string]: unknown };
	done?: boolean;
	client_tool_call?: ToolCallEvent;
	server_tool_call?: ServerToolCallEvent;
	assistant_message?: {
		role: 'assistant';
		content: string;
		tool_calls: OpenAIToolCall[];
	};
	error?: string;
}

/**
 * Parse Server-Sent Events (SSE) stream from WordPress
 */
export async function* parseSSEStream(
	response: Response
): AsyncGenerator<StreamChunk, void, unknown> {
	const reader = response.body?.getReader();
	if (!reader) {
		throw new Error('Response body is not readable');
	}

	const decoder = new TextDecoder();
	let buffer = '';

	try {
		while (true) {
			const { done, value } = await reader.read();

			if (done) {
				break;
			}

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split('\n');
			buffer = lines.pop() || '';

			for (const line of lines) {
				// Skip empty lines
				if (!line.trim()) {
					continue;
				}

				// Standard SSE format: "data: {json}"
				if (line.startsWith('data: ')) {
					const data = line.slice(6);

					if (data === '[DONE]') {
						return;
					}

					try {
						const chunk: StreamChunk = JSON.parse(data);
						yield chunk;
					} catch {
						console.warn('Failed to parse SSE chunk. Line:', line);
					}
				} else {
					// Try to parse as raw JSON (defensive parsing for malformed SSE)
					// This handles cases where the "data: " prefix is missing
					try {
						const chunk: StreamChunk = JSON.parse(line);
						console.warn(
							'Parsed malformed SSE line (missing data: prefix):',
							line.substring(0, 100)
						);
						yield chunk;
					} catch {
						// Not valid JSON, skip it
						console.warn(
							'Skipped invalid SSE line:',
							line.substring(0, 100)
						);
					}
				}
			}
		}
	} finally {
		reader.releaseLock();
	}
}

/**
 * Accumulate text from stream chunks
 */
export function accumulateStreamText(chunks: StreamChunk[]): string {
	return chunks
		.map((chunk) => {
			// Handle delta as string
			if (typeof chunk.delta === 'string') {
				return chunk.delta;
			}
			// Handle delta as object with content property
			if (
				chunk.delta &&
				typeof chunk.delta === 'object' &&
				'content' in chunk.delta
			) {
				return chunk.delta.content || '';
			}
			// Fall back to content property
			return chunk.content || '';
		})
		.join('');
}
