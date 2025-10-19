/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * External dependencies
 */
import type { Ability } from '@wordpress/abilities';

/**
 * wp-ability-toolkit/reload ability
 *
 * Reloads the current page. Useful after making changes that require
 * a page refresh, such as registering new abilities or changing settings.
 */
export const reloadAbility: Ability = {
	name: 'wp-ability-toolkit/reload',
	label: __('Reload Page', 'wp-ability-toolkit'),
	description: __(
		'Reloads the current WordPress admin page. Use this after making changes that require a page refresh, such as activating plugins, updating settings, or registering new abilities.',
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
		// Reload the page
		window.location.reload();

		// This return won't actually be seen as the page reloads,
		// but we include it for completeness
		return {
			success: true,
			message: 'Reloading page...',
		};
	},
	permissionCallback: () => {
		// Available to logged-in users
		// @ts-ignore
		return !!window.wpAbilityToolkit?.nonce;
	},
};
