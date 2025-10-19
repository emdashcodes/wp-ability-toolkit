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
import { retrieveContinuation, clearContinuation } from '../utils/continuation';
import { debug } from '../debug';
import { ChatHeader } from './ChatHeader';

/**
 * Get the message to send for continuation completion
 * Returns structured JSON payload that will be sent as context
 */
function getContinuationCompletionMessage(type: 'navigate' | 'reload'): string {
	const payload = {
		type: `${type}-complete`,
		success: true,
		message:
			type === 'navigate'
				? `I have navigated to ${window.location.pathname}. The page has loaded successfully.`
				: `The page has been reloaded successfully.`,
		path: window.location.pathname,
	};
	return JSON.stringify(payload);
}

export function AbilityChat() {
	const continuationSentRef = useRef(false);
	const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
	const [isExpanded, setIsExpanded] = useState(() => {
		return (
			retrieveContinuation() !== null ||
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


	// Check for pending continuation (navigate/reload) and continue conversation
	useEffect(() => {
		// Skip if we've already sent the message
		if (continuationSentRef.current) {
			return;
		}

		const pendingContinuation = retrieveContinuation();
		if (!pendingContinuation) {
			debug('[Ability Toolkit] No pending continuation detected');
			return;
		}

		debug(
			'[Ability Toolkit] Pending continuation detected:',
			pendingContinuation
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
		// Clear the continuation state to prevent re-detection
		clearContinuation();

		const continueWithStoredToolCall = async () => {
			try {
				// Check if we have stored continuation data (new optimized flow)
				if (
					pendingContinuation.assistantMessage &&
					pendingContinuation.toolResult
				) {
					debug(
						'[Ability Toolkit] Found stored tool call, continuing conversation'
					);
					debug(
						'[Ability Toolkit] Assistant message:',
						pendingContinuation.assistantMessage
					);
					debug(
						'[Ability Toolkit] Tool result:',
						pendingContinuation.toolResult
					);

					// Use the new continueWithToolResult method
					if (
						typeof chatProps.continueWithToolResult === 'function'
					) {
						await chatProps.continueWithToolResult(
							pendingContinuation.assistantMessage,
							pendingContinuation.toolResult
						);
						debug(
							`[Ability Toolkit] ${pendingContinuation.continuationType} continuation completed`
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
						getContinuationCompletionMessage(
							pendingContinuation.continuationType
						);

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
					(c) =>
						c.type === 'text' && c.text && c.text.trim().length > 0
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
	}, [
		chatProps.registerMessageActions,
		chatProps.unregisterMessageActions,
		copiedMessageId,
	]);

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

	const handleClear = useCallback(() => {
		if (
			window.confirm(
				'Are you sure you want to clear the conversation? This cannot be undone.'
			)
		) {
			chatProps.clearConversation();
		}
	}, [chatProps]);

	const handleClose = useCallback(() => {
		setIsExpanded(false);
		localStorage.setItem('wp-ability-toolkit-chat-open', 'false');
	}, []);

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
					<ChatHeader
						onClear={handleClear}
						onMinimize={handleClose}
					/>
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
