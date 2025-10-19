/**
 * Chat widget entry point
 * Initializes the Shadow DOM custom element and registers abilities
 */

import './ChatWidgetElement';
import { registerAbilities, storeNavigationContinuation } from '../abilities';

// Expose storeNavigationContinuation globally for useWordPressChat to access
declare global {
	interface Window {
		__wpAbilityToolkit_storeNavigationContinuation?: typeof storeNavigationContinuation;
	}
}

async function init() {
	// Register all abilities BEFORE creating the chat widget
	// This ensures abilities are available when the chat loads them
	await registerAbilities();

	// Expose navigation continuation function for cross-package access
	window.__wpAbilityToolkit_storeNavigationContinuation =
		storeNavigationContinuation;

	// Now create and mount the chat widget
	const chatWidget = document.createElement('ability-chat-widget');
	document.body.appendChild(chatWidget);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', init);
} else {
	init();
}
