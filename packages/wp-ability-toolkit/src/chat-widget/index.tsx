/**
 * Chat widget entry point
 * Initializes the Shadow DOM custom element and registers abilities
 */

import './ChatWidgetElement';
import { registerAbilities, storeContinuationData } from '../abilities';

declare global {
	interface Window {
		__wpAbilityToolkit_storeNavigationContinuation?: typeof storeContinuationData;
	}
}

async function init() {
	await registerAbilities();

	window.__wpAbilityToolkit_storeNavigationContinuation =
		storeContinuationData;

	const chatWidget = document.createElement('ability-chat-widget');
	document.body.appendChild(chatWidget);
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', init);
} else {
	init();
}
