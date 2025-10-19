/**
 * Debug logging utility
 * Set WP_ABILITY_TOOLKIT_DEBUG in localStorage to enable debug logs
 */

const isDebugEnabled = (): boolean => {
	if (typeof window === 'undefined') {
		return false;
	}
	return localStorage.getItem('WP_ABILITY_TOOLKIT_DEBUG') === 'true';
};

export const debug = (...args: any[]): void => {
	if (isDebugEnabled()) {
		console.log(...args);
	}
};
