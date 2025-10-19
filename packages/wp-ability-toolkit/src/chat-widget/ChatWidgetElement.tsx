/**
 * Shadow DOM Web Component wrapper for chat widget
 * Provides complete style isolation from wp-admin
 */

import { createRoot } from '@wordpress/element';
import { AbilityChat } from './AbilityChat';
import { debug } from '../debug';

declare global {
	interface Window {
		wpAbilityToolkit?: {
			nonce: string;
			endpoint: string;
			pluginUrl: string;
		};
	}
}

export class ChatWidgetElement extends HTMLElement {
	private root: ReturnType<typeof createRoot> | null = null;
	private shadow: ShadowRoot;

	constructor() {
		super();
		// Create Shadow DOM for complete encapsulation
		this.shadow = this.attachShadow({ mode: 'closed' });
	}

	async connectedCallback() {
		const cssUrls = this.getCssUrls();
		const cssText = await this.loadAllCss(cssUrls);

		const styleElement = document.createElement('style');
		styleElement.textContent = `
			/* Host positioning - Shadow DOM provides isolation */
			:host {
				all: initial;
				position: fixed !important;
				bottom: 20px !important;
				right: 20px !important;
				z-index: 999999 !important;
				max-width: 600px !important;
				width: calc(100% - 40px) !important;
				display: block !important;
				font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif !important;
			}

			:host([hidden]) {
				display: none !important;
			}

			/* Base styles for Shadow DOM content */
			.ability-chat-shadow-container {
				box-sizing: border-box;
				font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
				font-size: 13px;
				line-height: 1.4em;
				color: #1e1e1e;
				overflow: visible !important;
			}

			.ability-chat-shadow-container *,
			.ability-chat-shadow-container *::before,
			.ability-chat-shadow-container *::after {
				box-sizing: border-box;
			}

			/* Tooltip z-index fixes for Shadow DOM */
			/* Ensure tooltips render above all other content */
			[title]:hover::after,
			[data-tooltip]:hover::after,
			.chart-tooltip,
			.visx-tooltip {
				z-index: 999999 !important;
				position: relative !important;
			}

			/* Ensure tooltip containers don't clip tooltips */
			[class*="Message-module"],
			[class*="MessageActions-module"],
			[class*="Chat-module"] {
				overflow: visible !important;
			}

			/* Load the bundled agenttic-ui styles */
			${cssText}
		`;
		this.shadow.appendChild(styleElement);

		const container = document.createElement('div');
		container.className = 'ability-chat-shadow-container';
		this.shadow.appendChild(container);

		// Stop keyboard events from bubbling out of Shadow DOM
		['keydown', 'keyup', 'keypress'].forEach((eventType) => {
			this.shadow.addEventListener(
				eventType,
				(event) => {
					event.stopPropagation();
				},
				false
			);
		});

		this.root = createRoot(container);
		this.root.render(<AbilityChat />);
	}

	disconnectedCallback() {
		if (this.root) {
			this.root.unmount();
			this.root = null;
		}
	}

	private getCssUrls(): string[] {
		const pluginUrl = window.wpAbilityToolkit?.pluginUrl || '';
		const cssUrl = `${pluginUrl}/build/chat-widget/index.css`;
		return [cssUrl];
	}

	private async loadAllCss(urls: string[]): Promise<string> {
		try {
			const responses = await Promise.all(
				urls.map((url) =>
					fetch(url).then((res) => {
						if (!res.ok) {
							console.warn(
								`[Ability Tester] Failed to load CSS: ${url}`
							);
							return '';
						}
						return res.text();
					})
				)
			);
			return responses.filter(Boolean).join('\n');
		} catch (error) {
			console.error('[Ability Tester] Failed to load styles:', error);
			return '';
		}
	}
}

if (!customElements.get('ability-chat-widget')) {
	customElements.define('ability-chat-widget', ChatWidgetElement);
}
