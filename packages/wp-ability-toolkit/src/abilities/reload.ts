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
		properties: {},
	},
	output_schema: {
		type: 'object',
		properties: {
			success: {
				type: 'boolean',
				description: 'Whether the reload was initiated',
			},
			message: {
				type: 'string',
				description: 'Confirmation message',
			},
		},
	},
	callback: async () => {
		// Set a flag that will be checked after reload to confirm it happened
		// sessionStorage persists across reload but not navigation
		sessionStorage.setItem('wp-ability-toolkit-reload-pending', 'true');

		// Store continuation state for post-reload detection
		storeContinuation(window.location.href, 'reload');

		// Store chat open state so it reopens after reload
		localStorage.setItem('wp-ability-toolkit-chat-open', 'true');

		// Reload after a delay (800ms) to ensure continuation data is stored
		// This allows time for the async tool call handler to complete and store
		// the assistant message + tool result for continuation after reload
		setTimeout(() => {
			window.location.reload();
		}, 800);

		// Signal to useWordPressChat to skip normal continuation request
		return {
			success: true,
			message: 'Reloading page...',
			_skipContinuation: true,
		};
	},
	permissionCallback: () => {
		// Available to logged-in users
		return !!window.wpAbilityToolkit?.nonce;
	},
};
