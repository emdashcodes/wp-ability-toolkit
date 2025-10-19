/**
 * @automattic/agenttic-ai-sdk-bridge
 * Client-side bridge between WordPress REST API and Agenttic UI
 */

// Main hook
export { useWordPressChat } from './useWordPressChat.js';

// Extracted hooks
export { useConversationStorage } from './hooks/useConversationStorage.js';
export { useMessageConverter } from './hooks/useMessageConverter.js';
export { useAbortController } from './hooks/useAbortController.js';
export { useStreamingRequest } from './hooks/useStreamingRequest.js';
export { useToolCallHandler } from './hooks/useToolCallHandler.js';

// Debug utility
export { debug } from './debug.js';

// Utilities
export { parseErrorResponse } from './utils/errorParser.js';
export { formatToolContent } from './utils/toolFormatter.js';

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
export type {
	StreamChunk,
	ToolCallEvent,
	ServerToolCallEvent,
} from './streamAdapter.js';
export type { DeltaAccumulatorOptions } from './deltaAccumulator.js';
export type { ConversationData } from './conversationStorage.js';
export type {
	ToolCall as ToolCallRequest,
	ToolResult,
} from './toolRegistry.js';
export type {
	StreamingRequestConfig,
	StreamingRequestPayload,
} from './hooks/useStreamingRequest.js';
