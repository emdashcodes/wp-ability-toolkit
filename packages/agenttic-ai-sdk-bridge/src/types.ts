/**
 * Type definitions for WordPress REST API ↔ Agenttic UI bridge
 */

import type {
	UIMessage as AgentticUIMessage,
	Suggestion as AgentticSuggestion,
} from '@automattic/agenttic-client';
import type { MessageAction } from '@automattic/agenttic-ui';

import type {
	Ability,
	AbilityInput,
	AbilityOutput,
} from '@wordpress/abilities';

export interface UIMessage extends AgentticUIMessage {
	disabled?: boolean;
}

export type UIMessageAction = MessageAction;

/**
 * Suggestion definition
 * Extended from Agenttic Client's Suggestion type to add custom action handler
 */
export interface Suggestion extends AgentticSuggestion {
	action?: () => void | Promise<void>; // WordPress-specific extension
}

export interface ToolCallContent {
	id: string;
	name: string;
	input: AbilityInput;
	status: 'pending' | 'success' | 'error';
	output?: AbilityOutput;
	error?: string;
}

export interface MessageActionsRegistration {
	id: string;
	actions: UIMessageAction[] | ((message: UIMessage) => UIMessageAction[]);
}

export interface OpenAIToolCall {
	id: string;
	type: 'function';
	function: {
		name: string;
		arguments: string; // JSON string
	};
}

export interface WordPressMessage {
	role: 'user' | 'assistant' | 'tool';
	content:
		| string
		| Array<{ type: string; text?: string; [key: string]: unknown }>;
	tool_calls?: OpenAIToolCall[];
	tool_call_id?: string; // For OpenAI format tool results
}

/**
 * Client-side ability definition
 */
export type ClientAbility = Pick<
	Ability,
	| 'name'
	| 'label'
	| 'description'
	| 'category'
	| 'input_schema'
	| 'output_schema'
>;

export interface WordPressChatRequest {
	messages: WordPressMessage[];
	clientAbilities?: ClientAbility[];
}

export interface WordPressChatResponse {
	id: string;
	role: 'assistant';
	content: string;
	timestamp: number;
}

// Hook configuration
export interface UseWordPressChatConfig {
	endpoint: string;
	nonce: string;
	onToolCall?: (toolCall: ToolCallContent) => void;

	/**
	 * Request timeout in milliseconds
	 * @default 120000 (2 minutes)
	 */
	timeout?: number;

	/**
	 * Enable streaming mode
	 * When true, uses SSE streaming for responses
	 * When false, uses regular POST requests
	 * @default true
	 */
	enableStreaming?: boolean;

	/**
	 * localStorage key for conversation persistence
	 * If provided, conversation will be saved/loaded from localStorage
	 * @default undefined (no persistence)
	 */
	conversationStorageKey?: string;
}

export interface UseWordPressChatReturn {
	messages: UIMessage[];
	isProcessing: boolean;
	error: string | null;
	onSubmit: (message: string) => Promise<void>;
	continueWithToolResult: (
		assistantMessage: WordPressMessage,
		toolResult: WordPressMessage
	) => Promise<void>;
	suggestions: Suggestion[];

	// UI management methods
	registerSuggestions: (suggestions: Suggestion[]) => void;
	clearSuggestions: () => void;

	// Message actions methods
	registerMessageActions: (registration: MessageActionsRegistration) => void;
	unregisterMessageActions: (id: string) => void;
	clearAllMessageActions: () => void;
	messageActionsRegistrations: MessageActionsRegistration[];

	// Tool integration
	addMessage: (message: UIMessage) => void;

	// Abort control
	abortCurrentRequest: () => void;

	// Conversation management
	clearConversation: () => void;
}
