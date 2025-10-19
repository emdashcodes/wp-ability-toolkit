/**
 * External dependencies
 */
import type { WordPressMessage } from '@emdashcodes/agenttic-ai-sdk-bridge';

/**
 * Internal dependencies
 */
import { debug } from '../debug';

/**
 * Continuation type - determines validation logic
 */
export type ContinuationType = 'navigate' | 'reload';

/**
 * Continuation state interface
 */
export interface ContinuationState {
	destination: string;
	timestamp: number;
	continuationType: ContinuationType;
	assistantMessage?: WordPressMessage; // The assistant message with tool_calls
	toolResult?: WordPressMessage; // The tool execution result message
	initiatingUrl?: string; // URL where continuation was initiated - used to detect if action completed
}

/**
 * Storage key for pending continuation
 */
const CONTINUATION_STORAGE_KEY = '_wp_ability_toolkit_pending_continuation';

/**
 * Continuation expiry time (5 minutes)
 */
const CONTINUATION_EXPIRY_MS = 5 * 60 * 1000;

/**
 * Store continuation state in localStorage
 * @param destination - The URL to navigate to (or current URL for reload)
 * @param type - The type of continuation ('navigate' or 'reload')
 */
export function storeContinuation(
	destination: string,
	type: ContinuationType
): void {
	const state: ContinuationState = {
		destination,
		timestamp: Date.now(),
		continuationType: type,
		// Store initiating URL for validation
		initiatingUrl: window.location.href,
	};
	localStorage.setItem(CONTINUATION_STORAGE_KEY, JSON.stringify(state));
}

/**
 * Store continuation data (assistant message + tool result)
 * This should be called before navigation/reload to preserve the conversation state
 *
 * @param assistantMessage - The assistant message with tool_calls
 * @param toolResult - The tool execution result
 */
export function storeContinuationData(
	assistantMessage: any,
	toolResult: any
): void {
	try {
		const stored = localStorage.getItem(CONTINUATION_STORAGE_KEY);
		if (!stored) {
			debug(
				'[Ability Toolkit] Cannot store continuation data - no continuation state found'
			);
			return;
		}
		const state: ContinuationState = JSON.parse(stored);
		state.assistantMessage = assistantMessage;
		state.toolResult = toolResult;
		// Store the current URL - we'll use this to validate continuation
		state.initiatingUrl = window.location.href;
		localStorage.setItem(CONTINUATION_STORAGE_KEY, JSON.stringify(state));
		debug('[Ability Toolkit] Stored continuation data successfully');
		debug('[Ability Toolkit] - Continuation type:', state.continuationType);
		debug('[Ability Toolkit] - Initiating URL:', state.initiatingUrl);
		debug(
			'[Ability Toolkit] - Has assistant message:',
			!!state.assistantMessage
		);
		debug('[Ability Toolkit] - Has tool result:', !!state.toolResult);
	} catch (error) {
		console.error(
			'[Ability Toolkit] Failed to store continuation data:',
			error
		);
	}
}

/**
 * Retrieve and validate continuation state from localStorage
 * Applies type-aware validation logic
 * @return Continuation state if valid, null otherwise
 */
export function retrieveContinuation(): ContinuationState | null {
	try {
		const stored = localStorage.getItem(CONTINUATION_STORAGE_KEY);
		if (!stored) {
			debug('[Ability Toolkit] No continuation state in localStorage');
			return null;
		}

		const state: ContinuationState = JSON.parse(stored);
		debug('[Ability Toolkit] Retrieved continuation state:');
		debug('[Ability Toolkit] - Type:', state.continuationType);
		debug('[Ability Toolkit] - Destination:', state.destination);
		debug('[Ability Toolkit] - Initiating URL:', state.initiatingUrl);
		debug('[Ability Toolkit] - Current URL:', window.location.href);
		debug(
			'[Ability Toolkit] - Has assistant message:',
			!!state.assistantMessage
		);
		debug('[Ability Toolkit] - Has tool result:', !!state.toolResult);

		// Type-aware validation
		if (state.initiatingUrl) {
			const urlChanged = state.initiatingUrl !== window.location.href;
			debug('[Ability Toolkit] - URL changed:', urlChanged);

			if (state.continuationType === 'navigate') {
				// Navigate: Must be on different URL (navigation completed)
				if (!urlChanged) {
					debug(
						'[Ability Toolkit] Skipping continuation - navigate type but URL unchanged, navigation not complete'
					);
					return null;
				}
			} else if (state.continuationType === 'reload') {
				// Reload: Must be on same URL (didn't navigate away)
				if (urlChanged) {
					debug(
						'[Ability Toolkit] Clearing continuation - reload type but URL changed unexpectedly'
					);
					clearContinuation();
					return null;
				}
				// For reload, URL doesn't change so just continue
				debug(
					'[Ability Toolkit] Reload confirmed - continuing conversation'
				);
			}
		}

		// Check if continuation has expired
		if (Date.now() - state.timestamp > CONTINUATION_EXPIRY_MS) {
			debug('[Ability Toolkit] Continuation expired');
			localStorage.removeItem(CONTINUATION_STORAGE_KEY);
			return null;
		}

		debug('[Ability Toolkit] Continuation validated successfully');
		return state;
	} catch (error) {
		console.error(
			'[Ability Toolkit] Error retrieving continuation state:',
			error
		);
		return null;
	}
}

/**
 * Clear continuation state from localStorage
 */
export function clearContinuation(): void {
	localStorage.removeItem(CONTINUATION_STORAGE_KEY);
}
