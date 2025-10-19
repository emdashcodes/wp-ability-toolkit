/**
 * Main chat component using Agenttic UI
 */

import {
	useEffect,
	useRef,
	useMemo,
	useState,
	createElement,
	useCallback,
} from '@wordpress/element';
import { Icon } from '@wordpress/components';
import { copy, check } from '@wordpress/icons';
import {
	AgentUI,
	AgentUIContainer,
	AgentUIConversationView,
	AgentUIMessages,
	AgentUIFooter,
	AgentUIInput,
} from '@automattic/agenttic-ui';
import '@automattic/agenttic-ui/index.css';
import './agenttic-ui-overrides.css';
import {
	useWordPressChat,
	copyToClipboard,
} from '@emdashcodes/agenttic-ai-sdk-bridge';
import { retrieveNavigationState, clearNavigationState } from '../abilities';
import { debug } from '../debug';
import { ChatHeader } from './ChatHeader';

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

	// Track which message was just copied (to show checkmark)
	const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

	// Track chat open state
	const [isExpanded, setIsExpanded] = useState(() => {
		return (
			retrieveNavigationState() !== null ||
			localStorage.getItem('wp-ability-toolkit-chat-open') === 'true'
		);
	});

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
		debug('[Ability Toolkit] Should expand:', isExpanded);
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
	}, [isExpanded]);

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

		debug('[Ability Toolkit] Pending navigation detected:', pendingNav);

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
			actions: (message) => {
				// Don't show copy button on user messages
				if (message.role === 'user') {
					return [];
				}

				// Don't show copy button for tool call messages (they have their own icons)
				// Tool calls are agent messages with component content
				if (
					message.role === 'agent' &&
					message.content?.some((c) => c.type === 'component')
				) {
					return [];
				}

				// Don't show copy button if there's no text content to copy
				const hasTextContent = message.content?.some(
					(c) => c.type === 'text' && c.text && c.text.trim().length > 0
				);

				if (!hasTextContent) {
					return [];
				}

				// Don't show if message is disabled (hidden system messages)
				if (message.disabled) {
					return [];
				}

				// Show checkmark if this message was just copied
				const isCopied = copiedMessageId === message.id;

				return [
					{
						id: 'copy',
						icon: createElement(Icon, {
							icon: isCopied ? check : copy,
							size: 18,
						}),
						label: 'Copy',
						tooltip: 'Copy message text',
						showLabel: false,
						onClick: async (msg) => {
							// Extract text content from message
							const textContent = msg.content
								.filter((c) => c.type === 'text' && c.text)
								.map((c) => c.text)
								.join('\n');

							if (textContent) {
								await copyToClipboard(textContent, () => {
									setCopiedMessageId(msg.id);
									// Reset after 2 seconds
									setTimeout(() => {
										setCopiedMessageId(null);
									}, 2000);
								});
							}
						},
					},
				];
			},
		});

		// Cleanup on unmount
		return () => {
			if (chatProps.unregisterMessageActions) {
				chatProps.unregisterMessageActions('copy-message');
			}
		};
	}, [chatProps.registerMessageActions, chatProps.unregisterMessageActions, copiedMessageId]);

	// Compute messages with actions applied
	const messagesWithActions = useMemo(() => {
		return chatProps.messages.map((message) => {
			// Compute actions for this message from all registrations
			const actions = chatProps.messageActionsRegistrations.flatMap(
				(registration) => {
					if (typeof registration.actions === 'function') {
						return registration.actions(message);
					}
					return registration.actions;
				}
			);

			// Return message with actions attached
			return {
				...message,
				actions: actions.length > 0 ? actions : undefined,
			};
		});
	}, [chatProps.messages, chatProps.messageActionsRegistrations]);

	// Handle clear conversation with confirmation
	const handleClear = useCallback(() => {
		if (
			window.confirm(
				'Are you sure you want to clear the conversation? This cannot be undone.'
			)
		) {
			chatProps.clearConversation();
		}
	}, [chatProps]);

	// Handle minimize/close
	const handleClose = useCallback(() => {
		setIsExpanded(false);
		localStorage.setItem('wp-ability-toolkit-chat-open', 'false');
	}, []);

	// Handle expand
	const handleExpand = useCallback(() => {
		setIsExpanded(true);
		localStorage.setItem('wp-ability-toolkit-chat-open', 'true');
	}, []);

	return (
		<div style={{ position: 'relative' }}>
			<AgentUIContainer
				messages={messagesWithActions}
				isProcessing={chatProps.isProcessing}
				error={chatProps.error}
				onSubmit={chatProps.onSubmit}
				suggestions={chatProps.suggestions}
				clearSuggestions={chatProps.clearSuggestions}
				variant="floating"
				onClose={handleClose}
				onExpand={handleExpand}
				floatingChatState={isExpanded ? 'expanded' : 'collapsed'}
				placeholder="Ask me anything..."
				expandOnClick={true}
				className="agenttic"
			>
				<AgentUIConversationView className="with-custom-header">
					<ChatHeader onClear={handleClear} onMinimize={handleClose} />
					<div
						className="conversation-content"
						style={{
							display: 'flex',
							flexDirection: 'column',
							flex: 1,
							minHeight: 0,
							justifyContent: 'flex-end',
						}}
					>
						<AgentUIMessages />
						<AgentUIFooter>
							<AgentUIInput />
						</AgentUIFooter>
					</div>
				</AgentUIConversationView>
			</AgentUIContainer>
		</div>
	);
}
