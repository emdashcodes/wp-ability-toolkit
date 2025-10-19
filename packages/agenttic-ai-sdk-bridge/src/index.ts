/**
 * @automattic/agenttic-ai-sdk-bridge
 * Client-side bridge between WordPress REST API and Agenttic UI
 */

// Main hook
export { useWordPressChat } from './useWordPressChat.js';

// Debug utility
export { debug } from './debug.js';

// Components
export { ToolCall } from './components/ToolCall.js';

// Stream utilities
export { parseSSEStream, accumulateStreamText } from './streamAdapter.js';
export {
	DeltaAccumulator,
	createDeltaAccumulator,
} from './deltaAccumulator.js';

// Conversation storage
export {
	loadConversation,
	saveConversation,
	clearConversation,
	hasConversation,
	getConversationMetadata,
} from './conversationStorage.js';

// Tool registry
export {
	getAllClientAbilities,
	executeClientAbility,
	executeToolCall,
} from './toolRegistry.js';

// Types
export type {
	UIMessage,
	UIMessageAction,
	Suggestion,
	MessageActionsRegistration,
	WordPressMessage,
	WordPressChatRequest,
	WordPressChatResponse,
	UseWordPressChatConfig,
	UseWordPressChatReturn,
	ClientAbility,
	ToolCallContent,
} from './types.js';

export type { ToolCallProps } from './components/ToolCall.js';
export type { StreamChunk, ToolCallEvent } from './streamAdapter.js';
export type { DeltaAccumulatorOptions } from './deltaAccumulator.js';
export type { ConversationData } from './conversationStorage.js';
export type {
	ToolCall as ToolCallRequest,
	ToolResult,
} from './toolRegistry.js';
