/**
 * WordPress dependencies
 */
import { registerAbility, registerAbilityCategory } from '@wordpress/abilities';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { navigateAbility } from './navigate';
import { reloadAbility } from './reload';
import { debug } from '../debug';

/**
 * Re-export continuation utilities for use in other modules
 * (for backward compatibility and global registration)
 */
export {
	retrieveContinuation,
	clearContinuation,
	storeContinuationData,
	type ContinuationState,
	type ContinuationType,
} from '../utils/continuation';

/**
 * Register all Ability Toolkit abilities
 *
 * This function should be called during plugin initialization
 * to make all client-side abilities available to the WordPress
 * Abilities API.
 */
export async function registerAbilities(): Promise<void> {
	try {
		// Register navigation category first
		await registerAbilityCategory('navigation', {
			label: __('Navigation', 'wp-ability-toolkit'),
			description: __(
				'Abilities for navigating and controlling the browser',
				'wp-ability-toolkit'
			),
		});
		debug('[Ability Toolkit] Registered category: navigation');

		// Register navigate ability
		await registerAbility(navigateAbility);
		debug(
			'[Ability Toolkit] Registered ability: wp-ability-toolkit/navigate'
		);

		// Register reload ability
		await registerAbility(reloadAbility);
		debug(
			'[Ability Toolkit] Registered ability: wp-ability-toolkit/reload'
		);
	} catch (error) {
		console.error('[Ability Toolkit] Failed to register abilities:', error);
	}
}
