/**
 * Main chat component using Agenttic UI
 */

import { useEffect, useRef, createElement } from '@wordpress/element';
import { Icon } from '@wordpress/components';
import { copy } from '@wordpress/icons';
import { AgentUI } from '@automattic/agenttic-ui';
import '@automattic/agenttic-ui/index.css';
import './agenttic-ui-overrides.css';
import { useWordPressChat } from '@emdashcodes/agenttic-ai-sdk-bridge';
import { retrieveNavigationState, clearNavigationState } from '../abilities';
import { debug } from '../debug';

/**
 * Get the message to send for navigation completion
 * Returns structured JSON payload that will be sent as context
 */
function getNavigationCompletionMessage(): string {
	const payload = {
		type: 'navigation-complete',
		success: true,
		message: `I have navigated to ${window.location.pathname}. The page has loaded successfully.`,
		path: window.location.pathname,
	};
	return JSON.stringify(payload);
}

export function AbilityChat() {
	// Track if we've already sent the continuation message
	const continuationSentRef = useRef(false);

	// Check if chat should be initially expanded (e.g., after navigation)
	const shouldExpand =
		retrieveNavigationState() !== null ||
		localStorage.getItem('wp-ability-toolkit-chat-open') === 'true';

	const chatProps = useWordPressChat({
		endpoint:
			window.wpAbilityToolkit?.endpoint ||
			'/wp-json/wp-ability-toolkit/v1/chat',
		nonce: window.wpAbilityToolkit?.nonce || '',
		conversationStorageKey: 'wp-ability-toolkit-chat',
	});

	// Log initial state on mount
	useEffect(() => {
		debug('[Ability Toolkit] Chat initialized');
		debug('[Ability Toolkit] Should expand:', shouldExpand);
		debug(
			'[Ability Toolkit] Navigation state exists:',
			retrieveNavigationState() !== null
		);
		debug(
			'[Ability Toolkit] Chat open flag:',
			localStorage.getItem('wp-ability-toolkit-chat-open')
		);
		debug(
			'[Ability Toolkit] Conversation storage:',
			localStorage.getItem('wp-ability-toolkit-chat')?.substring(0, 200)
		);
	}, []);

	// Check for pending navigation and continue conversation with stored tool call
	useEffect(() => {
		// Skip if we've already sent the message
		if (continuationSentRef.current) {
			return;
		}

		const pendingNav = retrieveNavigationState();
		if (!pendingNav) {
			debug('[Ability Toolkit] No pending navigation detected');
			return;
		}

		debug(
			'[Ability Toolkit] Pending navigation detected:',
			pendingNav
		);

		// Wait for chat to be fully initialized
		if (chatProps.isLoading) {
			debug('[Ability Toolkit] Chat still loading, waiting...');
			return;
		}

		debug(
			'[Ability Toolkit] Chat initialized, messages:',
			chatProps.messages?.length || 0
		);

		// Mark as sent BEFORE calling the async function to prevent duplicate sends
		continuationSentRef.current = true;
		// Clear the navigation state to prevent re-detection
		clearNavigationState();

		const continueWithStoredToolCall = async () => {
			try {
				// Check if we have stored continuation data (new optimized flow)
				if (pendingNav.assistantMessage && pendingNav.toolResult) {
					debug(
						'[Ability Toolkit] Found stored tool call, continuing conversation'
					);
					debug(
						'[Ability Toolkit] Assistant message:',
						pendingNav.assistantMessage
					);
					debug(
						'[Ability Toolkit] Tool result:',
						pendingNav.toolResult
					);

					// Use the new continueWithToolResult method
					if (
						typeof chatProps.continueWithToolResult === 'function'
					) {
						await chatProps.continueWithToolResult(
							pendingNav.assistantMessage,
							pendingNav.toolResult
						);
						debug(
							'[Ability Toolkit] Navigation continuation completed'
						);
					} else {
						console.error(
							'[Ability Toolkit] continueWithToolResult is not available'
						);
					}
				} else {
					// Fallback to old flow (send synthetic user message)
					debug(
						'[Ability Toolkit] No stored tool call, using fallback continuation'
					);
					const continuationMessage =
						getNavigationCompletionMessage();

					if (typeof chatProps.onSubmit === 'function') {
						debug(
							'[Ability Toolkit] Sending continuation message:',
							continuationMessage
						);
						await chatProps.onSubmit(continuationMessage);
						debug(
							'[Ability Toolkit] Navigation continuation message sent successfully'
						);
					} else {
						console.error(
							'[Ability Toolkit] onSubmit is not available'
						);
					}
				}
			} catch (error) {
				console.error(
					'[Ability Toolkit] Failed to send continuation:',
					error
				);
			}
		};

		// Call immediately - chat is already initialized at this point
		continueWithStoredToolCall();
	}, [
		chatProps.onSubmit,
		chatProps.isLoading,
		chatProps.messages,
		chatProps.continueWithToolResult,
	]);

	// Register copy message actions
	useEffect(() => {
		if (!chatProps.registerMessageActions) {
			return;
		}

		chatProps.registerMessageActions({
			id: 'copy-message',
			actions: (_message) => [
				{
					id: 'copy',
					icon: createElement(Icon, { icon: copy, size: 20 }),
					label: 'Copy',
					tooltip: 'Copy message text',
					showLabel: false,
					onClick: async (msg) => {
						try {
							// Extract text content from message
							const textContent = msg.content
								.filter((c) => c.type === 'text' && c.text)
								.map((c) => c.text)
								.join('\n');

							if (textContent) {
								await navigator.clipboard.writeText(
									textContent
								);
							}
						} catch (err) {
							console.error('Failed to copy message:', err);
						}
					},
				},
			],
		});

		// Cleanup on unmount
		return () => {
			if (chatProps.unregisterMessageActions) {
				chatProps.unregisterMessageActions('copy-message');
			}
		};
	}, [chatProps.registerMessageActions, chatProps.unregisterMessageActions]);

	return (
		<div style={{ position: 'relative' }}>
			<AgentUI
				{...chatProps}
				variant="floating"
				placeholder="Ask me anything..."
				expandOnClick={true}
				floatingChatState={shouldExpand ? 'expanded' : undefined}
			/>
		</div>
	);
}
