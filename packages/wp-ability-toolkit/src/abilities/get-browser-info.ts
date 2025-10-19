/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * External dependencies
 */
import type { Ability } from '@wordpress/abilities';

/**
 * wp-ability-toolkit/get-browser-info ability
 *
 * Returns information about the user's browser including user agent,
 * screen size, and current URL.
 */
export const getBrowserInfoAbility: Ability = {
	name: 'wp-ability-toolkit/get-browser-info',
	label: __('Get Browser Info', 'wp-ability-toolkit'),
	description: __(
		"Returns information about the user's browser including user agent, screen size, and current URL",
		'wp-ability-toolkit'
	),
	category: 'data-retrieval',
	input_schema: {
		type: 'object',
		properties: {},
	},
	output_schema: {
		type: 'object',
		properties: {
			userAgent: { type: 'string' },
			screenWidth: { type: 'number' },
			screenHeight: { type: 'number' },
			currentUrl: { type: 'string' },
			language: { type: 'string' },
		},
	},
	callback: async () => {
		return {
			userAgent: navigator.userAgent,
			screenWidth: window.screen.width,
			screenHeight: window.screen.height,
			currentUrl: window.location.href,
			language: navigator.language,
		};
	},
	permissionCallback: () => {
		// Available to logged-in users
		// @ts-ignore
		return !!window.wpAbilityToolkit?.nonce;
	},
};
