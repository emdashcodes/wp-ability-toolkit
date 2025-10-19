/**
 * Hook for converting between UI and WordPress message formats
 */

import type { UIMessage, WordPressMessage } from '../types.js';

export function useMessageConverter() {
	/**
	 * Convert UI messages to WordPress REST API format
	 */
	const toWordPressMessages = (
		uiMessages: UIMessage[]
	): WordPressMessage[] => {
		return uiMessages
			.filter((msg) => msg.role === 'user' || msg.role === 'agent')
			.map((msg) => ({
				role: msg.role === 'agent' ? 'assistant' : 'user',
				content:
					msg.content
						.map((c) => {
							if (c.type === 'text') return c.text;
							return '';
						})
						.join('')
						.trim() || '',
			}));
	};

	return {
		toWordPressMessages,
	};
}
