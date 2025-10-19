/**
 * Hook for making streaming requests to WordPress REST API
 * Combines fetch, error handling, and SSE stream parsing
 */

import { useCallback } from '@wordpress/element';
import { parseSSEStream } from '../streamAdapter.js';
import { DeltaAccumulator } from '../deltaAccumulator.js';
import { parseErrorResponse } from '../utils/errorParser.js';
import { debug } from '../debug.js';
import type { StreamChunk } from '../streamAdapter.js';
import type { WordPressMessage, ClientAbility } from '../types.js';

export interface StreamingRequestConfig {
	endpoint: string;
	nonce: string;
	signal?: AbortSignal;
	enableStreaming?: boolean;
}

export interface StreamingRequestPayload {
	messages: WordPressMessage[];
	clientAbilities: ClientAbility[];
	clientContext: {
		url: string;
	};
}

export function useStreamingRequest() {
	/**
	 * Make a streaming request and process chunks
	 */
	const makeRequest = useCallback(
		async (
			config: StreamingRequestConfig,
			payload: StreamingRequestPayload,
			onUpdate: (content: string) => void,
			onChunk?: (chunk: StreamChunk) => void | Promise<void>
		): Promise<void> => {
			const { endpoint, nonce, signal, enableStreaming = true } = config;

			// Make fetch request
			const response = await fetch(endpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-WP-Nonce': nonce,
				},
				body: JSON.stringify(payload),
				signal,
			});

			// Handle errors
			if (!response.ok) {
				const errorMessage = await parseErrorResponse(response);
				throw new Error(errorMessage);
			}

			// Create delta accumulator for streaming
			const deltaAccumulator = new DeltaAccumulator({
				onUpdate,
				usePacing: enableStreaming,
			});

			// Process stream
			for await (const chunk of parseSSEStream(response)) {
				// Handle error events from SSE stream
				if (chunk.error) {
					throw new Error(chunk.error);
				}

				// Add chunk to accumulator for text content
				if (chunk.delta || chunk.content) {
					deltaAccumulator.addChunk(chunk);
				}

				// Allow caller to handle chunks (for tool calls, etc.)
				if (onChunk) {
					await onChunk(chunk);
				}

				// Check if done
				if (chunk.done) {
					deltaAccumulator.flush();
					break;
				}
			}

			// Flush any remaining content
			deltaAccumulator.flush();
		},
		[]
	);

	return { makeRequest };
}
