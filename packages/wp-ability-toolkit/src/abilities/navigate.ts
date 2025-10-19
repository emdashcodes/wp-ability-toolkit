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
import { storeContinuation } from '../utils/continuation';

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

		// Store continuation state for post-navigation detection
		storeContinuation(path, 'navigate');
		debug('[Ability Toolkit] Stored continuation state for:', path);

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
