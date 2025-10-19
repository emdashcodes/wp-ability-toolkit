/**
 * Type definitions for WordPress REST API ↔ Agenttic UI bridge
 */

import type { ReactNode } from 'react';

// UI Message format (matches Agenttic UI)
export interface UIMessage {
	id: string;
	role: 'user' | 'agent';
	content: Array<{
		type: 'text' | 'image_url' | 'component';
		text?: string;
		image_url?: string;
		component?: React.ComponentType;
		componentProps?: any;
	}>;
	timestamp: number;
	archived: boolean;
	showIcon: boolean;
	icon?: string;
	actions?: UIMessageAction[];
	disabled?: boolean;
}

// Tool call content
export interface ToolCallContent {
	id: string;
	name: string;
	input: any;
	status: 'pending' | 'success' | 'error';
	output?: any;
	error?: string;
}

export interface UIMessageAction {
	id: string;
	icon?: ReactNode;
	label: string;
	onClick: (message: UIMessage) => void | Promise<void>;
	tooltip?: string;
	disabled?: boolean;
	pressed?: boolean;
	showLabel?: boolean;
}

export interface Suggestion {
	id: string;
	label: string;
	prompt?: string;
	action?: () => void | Promise<void>;
}

export interface MessageActionsRegistration {
	id: string;
	actions: UIMessageAction[] | ((message: UIMessage) => UIMessageAction[]);
}

// WordPress REST API request/response types
export interface WordPressMessage {
	role: 'user' | 'assistant' | 'tool';
	content: string | any[]; // Can be string or array for tool results
	tool_calls?: any[]; // For OpenAI format tool calls
	tool_call_id?: string; // For OpenAI format tool results
}

export interface ClientAbility {
	name: string;
	label: string;
	description: string;
	category?: string;
	input_schema?: any;
	output_schema?: any;
}

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

// Hook return (matches useAgentChat interface)
export interface UseWordPressChatReturn {
	// AgentUI props
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

	// Tool integration
	addMessage: (message: UIMessage) => void;

	// Abort control
	abortCurrentRequest: () => void;
}
