/**
 * Hook for managing conversation persistence in localStorage
 */

import { useState, useEffect, useRef } from '@wordpress/element';
import { loadConversation, saveConversation } from '../conversationStorage.js';
import { debug } from '../debug.js';
import type { UIMessage } from '../types.js';

export function useConversationStorage(storageKey?: string) {
	// Load initial messages from storage
	const [messages, setMessages] = useState<UIMessage[]>(() => {
		if (storageKey) {
			const savedMessages = loadConversation(storageKey);
			if (savedMessages && savedMessages.length > 0) {
				debug(
					'[Conversation Storage] Restored conversation:',
					savedMessages.length,
					'messages'
				);
				return savedMessages;
			}
		}
		return [];
	});

	const [isProcessing, setIsProcessing] = useState(false);
	const previousStorageKey = useRef<string | undefined>(storageKey);

	// Save messages when they change (but not during processing)
	useEffect(() => {
		if (storageKey && messages.length > 0 && !isProcessing) {
			debug(
				'[Conversation Storage] Saving conversation:',
				messages.length,
				'messages'
			);
			saveConversation(storageKey, messages);
		}
	}, [messages, storageKey, isProcessing]);

	// Handle storage key changes
	useEffect(() => {
		if (storageKey && storageKey !== previousStorageKey.current) {
			previousStorageKey.current = storageKey;
			const savedMessages = loadConversation(storageKey);
			if (savedMessages && savedMessages.length > 0) {
				debug(
					'[Conversation Storage] Reloaded from new key:',
					savedMessages.length,
					'messages'
				);
				setMessages(savedMessages);
			} else {
				setMessages([]);
			}
		}
	}, [storageKey]);

	return {
		messages,
		setMessages,
		isProcessing,
		setIsProcessing,
	};
}
