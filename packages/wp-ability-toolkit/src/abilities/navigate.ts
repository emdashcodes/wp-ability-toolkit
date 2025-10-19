/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * External dependencies
 */
import type { Ability } from '@wordpress/abilities';

/**
 * Internal dependencies
 */
import { debug } from '../debug';

/**
 * Navigation state interface
 */
interface NavigationState {
	destination: string;
	timestamp: number;
	assistantMessage?: any; // The assistant message with tool_calls
	toolResult?: any; // The tool execution result
	initiatingUrl?: string; // URL where navigation was initiated - used to detect if navigation completed
}

/**
 * Storage key for pending navigation
 */
const NAVIGATION_STORAGE_KEY = '_wp_ability_toolkit_pending_navigation';

/**
 * Navigation expiry time (5 minutes)
 */
const NAVIGATION_EXPIRY_MS = 5 * 60 * 1000;

/**
 * Store navigation state in localStorage
 * @param destination - The URL to navigate to
 */
function storeNavigationState(destination: string): void {
	const state: NavigationState = {
		destination,
		timestamp: Date.now(),
	};
	localStorage.setItem(NAVIGATION_STORAGE_KEY, JSON.stringify(state));
}

/**
 * Store navigation continuation data (assistant message + tool result)
 * This should be called before navigation to preserve the conversation state
 *
 * @param assistantMessage - The assistant message with tool_calls
 * @param toolResult - The tool execution result
 */
export function storeNavigationContinuation(
	assistantMessage: any,
	toolResult: any
): void {
	try {
		const stored = localStorage.getItem(NAVIGATION_STORAGE_KEY);
		if (stored) {
			const state: NavigationState = JSON.parse(stored);
			state.assistantMessage = assistantMessage;
			state.toolResult = toolResult;
			// Store the current URL - we'll only continue if URL has changed
			state.initiatingUrl = window.location.href;
			localStorage.setItem(NAVIGATION_STORAGE_KEY, JSON.stringify(state));
			debug(
				'[Ability Toolkit] Stored navigation continuation data'
			);
		}
	} catch (error) {
		console.error(
			'[Ability Toolkit] Failed to store navigation continuation:',
			error
		);
	}
}

/**
 * Retrieve and validate navigation state from localStorage
 * @return Navigation state if valid, null otherwise
 */
export function retrieveNavigationState(): NavigationState | null {
	try {
		const stored = localStorage.getItem(NAVIGATION_STORAGE_KEY);
		if (!stored) {
			return null;
		}

		const state: NavigationState = JSON.parse(stored);

		// Check if we're still on the same page where navigation was initiated
		// Only continue if the URL has changed (i.e., navigation has completed)
		if (
			state.initiatingUrl &&
			state.initiatingUrl === window.location.href
		) {
			debug(
				'[Ability Toolkit] Skipping continuation - still on same URL, navigation not complete'
			);
			return null;
		}

		// Check if navigation has expired
		if (Date.now() - state.timestamp > NAVIGATION_EXPIRY_MS) {
			localStorage.removeItem(NAVIGATION_STORAGE_KEY);
			return null;
		}

		return state;
	} catch (error) {
		console.error(
			'[Ability Toolkit] Error retrieving navigation state:',
			error
		);
		return null;
	}
}

/**
 * Clear navigation state from localStorage
 */
export function clearNavigationState(): void {
	localStorage.removeItem(NAVIGATION_STORAGE_KEY);
}

/**
 * wp-ability-toolkit/navigate ability
 *
 * Navigates to a different wp-admin page with full page reload support.
 * After navigation completes, automatically resumes the conversation.
 */
export const navigateAbility: Ability = {
	name: 'wp-ability-toolkit/navigate',
	label: __('Navigate to WordPress admin page', 'wp-ability-toolkit'),
	description: __(
		'Navigate the browser to a different WordPress admin page. Use when the user asks to visit a specific section (e.g., "go to plugins", "show me settings", "navigate to dashboard"). The page will reload and conversation will continue automatically.\n\nCommon WordPress admin paths:\n- Dashboard: /wp-admin/index.php\n- Posts: /wp-admin/edit.php\n- Pages: /wp-admin/edit.php?post_type=page\n- Media: /wp-admin/upload.php\n- Comments: /wp-admin/edit-comments.php\n- Appearance/Themes: /wp-admin/themes.php\n- Plugins: /wp-admin/plugins.php\n- Users: /wp-admin/users.php\n- Tools: /wp-admin/tools.php\n- Settings (General): /wp-admin/options-general.php\n- Settings (Writing): /wp-admin/options-writing.php\n- Settings (Reading): /wp-admin/options-reading.php\n- Settings (Discussion): /wp-admin/options-discussion.php\n- Settings (Media): /wp-admin/options-media.php\n- Settings (Permalinks): /wp-admin/options-permalink.php',
		'wp-ability-toolkit'
	),
	category: 'navigation',
	input_schema: {
		type: 'object',
		properties: {
			path: {
				type: 'string',
				description:
					'The complete wp-admin path. MUST start with "/wp-admin/" and include the .php file. Common examples: "/wp-admin/index.php" (dashboard), "/wp-admin/plugins.php" (plugins), "/wp-admin/themes.php" (themes), "/wp-admin/users.php" (users), "/wp-admin/options-general.php" (general settings), "/wp-admin/edit.php" (posts).',
			},
		},
		required: ['path'],
		additionalProperties: false,
	},
	output_schema: {
		type: 'object',
		properties: {
			success: {
				type: 'boolean',
				description: 'Whether navigation was initiated successfully',
			},
			message: {
				type: 'string',
				description: 'Confirmation message or error details',
			},
			error: {
				type: 'string',
				description: 'Error message if navigation failed',
			},
		},
	},
	callback: async (input: { path: string }) => {
		const { path } = input;

		// Validate that path is provided
		if (!path || typeof path !== 'string') {
			return {
				success: false,
				error: 'path is required and must be a string. Example: "/wp-admin/plugins.php"',
			};
		}

		// Validate that path starts with /wp-admin/
		if (!path.startsWith('/wp-admin/')) {
			return {
				success: false,
				error: `Path must start with /wp-admin/. You provided: "${path}". Example: "/wp-admin/plugins.php"`,
			};
		}

		// Store navigation state for post-reload detection
		storeNavigationState(path);
		debug('[Ability Toolkit] Stored navigation state for:', path);

		// Store chat open state so it reopens after navigation
		localStorage.setItem('wp-ability-toolkit-chat-open', 'true');

		// Navigate after a delay (300ms for smooth UX)
		setTimeout(() => {
			debug('[Ability Toolkit] Navigating to:', path);
			window.location.href = path;
		}, 300);

		return {
			success: true,
			message: `Navigating to ${path}...`,
			_skipContinuation: true, // Signal to useWordPressChat to skip continuation request
		};
	},
};
