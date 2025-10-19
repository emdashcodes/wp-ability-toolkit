/**
 * Hook for managing abort controller and request timeout
 */

import { useRef, useCallback } from '@wordpress/element';

export function useAbortController() {
	const abortControllerRef = useRef<AbortController | null>(null);

	/**
	 * Create new abort controller with timeout
	 */
	const createAbortController = useCallback((timeoutMs: number) => {
		// Abort any existing request
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
		}

		// Create new controller
		const controller = new AbortController();
		abortControllerRef.current = controller;

		// Set timeout
		const timeoutId = setTimeout(() => {
			controller.abort();
		}, timeoutMs);

		// Return cleanup function
		return () => clearTimeout(timeoutId);
	}, []);

	/**
	 * Abort current request
	 */
	const abort = useCallback(() => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
			abortControllerRef.current = null;
		}
	}, []);

	/**
	 * Get current abort signal
	 */
	const getSignal = useCallback(() => {
		return abortControllerRef.current?.signal;
	}, []);

	return {
		createAbortController,
		abort,
		getSignal,
	};
}
