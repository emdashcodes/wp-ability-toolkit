/**
 * Conversation persistence using localStorage
 * Based on agenttic-client's conversation storage implementation
 */

import React from 'react';
import type { UIMessage, ToolCallContent } from './types.js';
import { ToolCall } from './components/ToolCall.js';

// Serializable version of UIMessage for storage
interface SerializableMessage {
	id: string;
	role: 'user' | 'agent';
	content: Array<{
		type: 'text' | 'image_url' | 'component';
		text?: string;
		image_url?: string;
		// For component type, we store the component data instead of the component itself
		componentType?: 'toolCall';
		componentData?: ToolCallContent;
	}>;
	timestamp: number;
	archived: boolean;
	showIcon: boolean;
	icon?: string;
	disabled?: boolean;
}

export interface ConversationData {
	messages: SerializableMessage[];
	timestamp: number;
}

/**
 * Convert UIMessage to SerializableMessage for storage
 */
function messageToSerializable(message: UIMessage): SerializableMessage {
	return {
		id: message.id,
		role: message.role,
		content: message.content.map((contentItem) => {
			if (
				contentItem.type === 'component' &&
				contentItem.componentProps?.toolCall
			) {
				// Store tool call data instead of component
				return {
					type: 'component',
					componentType: 'toolCall',
					componentData: contentItem.componentProps.toolCall,
				};
			}
			// For text and image_url, just copy as-is (without component/componentProps)
			return {
				type: contentItem.type,
				text: contentItem.text,
				image_url: contentItem.image_url,
			};
		}),
		timestamp: message.timestamp,
		archived: message.archived,
		showIcon: message.showIcon,
		icon: message.icon,
		disabled: message.disabled,
	};
}

/**
 * Save conversation to localStorage
 */
export function saveConversation(key: string, messages: UIMessage[]): void {
	if (!key) {
		return;
	}

	try {
		// Convert messages to serializable format
		const serializableMessages = messages.map(messageToSerializable);

		const data: ConversationData = {
			messages: serializableMessages,
			timestamp: Date.now(),
		};

		localStorage.setItem(key, JSON.stringify(data));
	} catch (_error) {
		// Handle quota exceeded or other localStorage errors
		console.warn('Failed to save conversation to localStorage:', _error);

		// Optionally clear old data if quota exceeded
		if (_error instanceof Error && _error.name === 'QuotaExceededError') {
			console.warn(
				'localStorage quota exceeded. Consider clearing old conversations.'
			);
		}
	}
}

/**
 * Convert SerializableMessage back to UIMessage, reconstructing components
 */
function serializableToMessage(
	serializableMsg: SerializableMessage
): UIMessage {
	return {
		id: serializableMsg.id,
		role: serializableMsg.role,
		content: serializableMsg.content.map((contentItem) => {
			if (
				contentItem.type === 'component' &&
				contentItem.componentType === 'toolCall' &&
				contentItem.componentData
			) {
				// Reconstruct the ToolCall component
				const toolCallData = contentItem.componentData;
				const ToolCallWrapper = (props: any) =>
					React.createElement(ToolCall, { toolCall: props.toolCall });

				return {
					type: 'component' as const,
					component: ToolCallWrapper,
					componentProps: { toolCall: toolCallData },
				};
			}
			// For text and image_url, just return as-is
			return {
				type: contentItem.type as 'text' | 'image_url' | 'component',
				text: contentItem.text,
				image_url: contentItem.image_url,
			};
		}),
		timestamp: serializableMsg.timestamp,
		archived: serializableMsg.archived,
		showIcon: serializableMsg.showIcon,
		icon: serializableMsg.icon,
		disabled: serializableMsg.disabled,
	};
}

/**
 * Load conversation from localStorage
 */
export function loadConversation(key: string): UIMessage[] | null {
	if (!key) {
		return null;
	}

	try {
		const stored = localStorage.getItem(key);

		if (!stored) {
			return null;
		}

		const data: ConversationData = JSON.parse(stored);

		// Validate the data structure
		if (!data.messages || !Array.isArray(data.messages)) {
			console.warn('Invalid conversation data in localStorage');
			return null;
		}

		// Convert serializable messages back to UI messages
		const uiMessages = data.messages.map(serializableToMessage);

		return uiMessages;
	} catch (error) {
		console.warn('Failed to load conversation from localStorage:', error);
		return null;
	}
}

/**
 * Clear conversation from localStorage
 */
export function clearConversation(key: string): void {
	if (!key) {
		return;
	}

	try {
		localStorage.removeItem(key);
	} catch (error) {
		console.warn('Failed to clear conversation from localStorage:', error);
	}
}

/**
 * Check if a conversation exists in localStorage
 */
export function hasConversation(key: string): boolean {
	if (!key) {
		return false;
	}

	try {
		return localStorage.getItem(key) !== null;
	} catch (error) {
		console.warn('Failed to check conversation in localStorage:', error);
		return false;
	}
}

/**
 * Get conversation metadata without loading full messages
 */
export function getConversationMetadata(
	key: string
): { timestamp: number; messageCount: number } | null {
	if (!key) {
		return null;
	}

	try {
		const stored = localStorage.getItem(key);

		if (!stored) {
			return null;
		}

		const data: ConversationData = JSON.parse(stored);

		return {
			timestamp: data.timestamp,
			messageCount: data.messages?.length || 0,
		};
	} catch (error) {
		console.warn('Failed to get conversation metadata:', error);
		return null;
	}
}
