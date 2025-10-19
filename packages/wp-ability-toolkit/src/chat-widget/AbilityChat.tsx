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
import { Icon, Button, Tooltip } from '@wordpress/components';
import { copy, check, copySmall } from '@wordpress/icons';
import {
	AgentUIContainer,
	AgentUIConversationView,
	AgentUIMessages,
	AgentUIFooter,
	AgentUIInput,
	createMessageRenderer,
} from '@automattic/agenttic-ui';
import '@automattic/agenttic-ui/index.css';
import './agenttic-ui-overrides.css';
import {
	useWordPressChat,
	copyToClipboard,
} from '@emdashcodes/agenttic-ai-sdk-bridge';
import { retrieveContinuation, clearContinuation } from '../utils/continuation';
import { ChatHeader } from './ChatHeader';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { ghcolors } from 'react-syntax-highlighter/dist/esm/styles/prism';

/**
 * Custom Code Block component with syntax highlighting
 */
function CodeBlock({ inline, className, children, ...props }: any) {
	const [copied, setCopied] = useState(false);

	// Extract language from className (format: language-javascript)
	const match = /language-(\w+)/.exec(className || '');
	const language = match ? match[1] : '';

	// Inline code styling
	if (inline) {
		return (
			<code
				className={className}
				style={{
					backgroundColor: 'rgba(135, 131, 120, 0.15)',
					borderRadius: '3px',
					padding: '0.2em 0.4em',
					fontSize: '85%',
					fontFamily: 'Consolas, Monaco, "Courier New", monospace',
				}}
				{...props}
			>
				{children}
			</code>
		);
	}

	// Block code with syntax highlighting
	const codeString = String(children).replace(/\n$/, '');

	const handleCopy = async () => {
		await copyToClipboard(codeString, () => {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		});
	};

	return (
		<div style={{ position: 'relative', marginBottom: '16px' }}>
			{language && (
				<div
					style={{
						position: 'absolute',
						top: '10px',
						left: '14px',
						fontSize: '11px',
						fontWeight: '600',
						color: '#2271b1',
						textTransform: 'uppercase',
						letterSpacing: '0.5px',
						zIndex: 1,
						background: '#fff',
						padding: '2px 6px',
						borderRadius: '3px',
						border: '1px solid #dcdcde',
					}}
				>
					{language}
				</div>
			)}
			<Tooltip text={copied ? 'Copied!' : 'Copy code'}>
				<Button
					icon={copied ? check : copySmall}
					size="small"
					variant="secondary"
					onClick={handleCopy}
					style={{
						position: 'absolute',
						top: '4px',
						right: '8px',
						minWidth: 'auto',
						height: '24px',
						padding: '0 8px',
						zIndex: 2,
					}}
				/>
			</Tooltip>
			<SyntaxHighlighter
				language={language || 'text'}
				style={ghcolors}
				customStyle={{
					margin: 0,
					borderRadius: '4px',
					padding: language ? '36px 16px 16px' : '16px',
					fontSize: '13px',
					lineHeight: '1.6',
					background: '#f6f7f7',
					border: '1px solid #dcdcde',
				}}
				codeTagProps={{
					style: {
						fontFamily:
							'Consolas, Monaco, "Courier New", monospace',
					},
				}}
				{...props}
			>
				{codeString}
			</SyntaxHighlighter>
		</div>
	);
}

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

	// Create message renderer with custom code block component and GFM support
	const messageRenderer = useMemo(
		() =>
			createMessageRenderer({
				components: {
					code: CodeBlock,
				},
				extensions: {
					gfm: {
						enabled: true,
					},
				},
			}),
		[]
	);

	// Check for pending continuation (navigate/reload) and continue conversation
	useEffect(() => {
		// Skip if we've already sent the message
		if (continuationSentRef.current) {
			return;
		}

		const pendingContinuation = retrieveContinuation();
		if (!pendingContinuation) {
			return;
		}

		// Wait for chat to be fully initialized
		if (chatProps.isLoading) {
			return;
		}

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
					// Use the new continueWithToolResult method
					if (
						typeof chatProps.continueWithToolResult === 'function'
					) {
						await chatProps.continueWithToolResult(
							pendingContinuation.assistantMessage,
							pendingContinuation.toolResult
						);
					} else {
						console.error(
							'[Ability Toolkit] continueWithToolResult is not available'
						);
					}
				} else {
					// Fallback to old flow (send synthetic user message)
					const continuationMessage =
						getContinuationCompletionMessage(
							pendingContinuation.continuationType
						);

					if (typeof chatProps.onSubmit === 'function') {
						await chatProps.onSubmit(continuationMessage);
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
				messageRenderer={messageRenderer}
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
