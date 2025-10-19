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
import { storeContinuation } from '../utils/continuation';

/**
 * wp-ability-toolkit/reload ability
 *
 * Reloads the current page with conversation continuation support.
 * After reload completes, automatically resumes the conversation.
 */
export const reloadAbility: Ability = {
	name: 'wp-ability-toolkit/reload',
	label: __('Reload Page', 'wp-ability-toolkit'),
	description: __(
		'Reloads the current WordPress admin page. Use this after making changes that require a page refresh, such as activating plugins, updating settings, or registering new abilities. The conversation will continue automatically after reload.',
		'wp-ability-toolkit'
	),
	category: 'navigation',
	input_schema: {
		type: 'object',
		properties: {
			label: {
				type: 'string',
				description:
					'Optional friendly label to display in the chat UI (e.g., "Settings Page", "Current Page"). This will be shown as "Reloaded [label]" in the chat.',
			},
		},
	},
	output_schema: {
		type: 'object',
		properties: {
			success: {
				type: 'boolean',
				description: 'Whether the reload was initiated',
			},
			label: {
				type: 'string',
				description:
					'Friendly label to display in the chat UI (e.g., "Settings Page", "Current Page"). This will be shown as "Reloaded [label]" in the chat.',
			},
		},
	},
	callback: async (input: { label?: string } = {}) => {
		const { label } = input;

		// Store continuation state for post-reload detection
		storeContinuation(window.location.href, 'reload');

		// Store chat open state so it reopens after reload
		localStorage.setItem('wp-ability-toolkit-chat-open', 'true');

		// Reload after a delay to ensure continuation data is stored
		setTimeout(() => {
			window.location.reload();
		}, 300);

		return {
			success: true,
			message: label ? `Reloading ${label}...` : 'Reloading page...',
			label, // Pass through the label for display in chat UI
			_skipContinuation: true,
		};
	},
	permissionCallback: () => {
		// Available to logged-in users
		return !!window.wpAbilityToolkit?.nonce;
	},
};
