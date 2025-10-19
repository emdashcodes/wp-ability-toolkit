/**
 * Parse error response from WordPress REST API or AI provider
 */
export async function parseErrorResponse(response: Response): Promise<string> {
	// Default error message based on status
	let errorMessage = `HTTP error! status: ${response.status}`;

	try {
		const errorData = await response.json();

		// Handle structured error objects (OpenAI/Anthropic format)
		if (errorData.error) {
			if (
				typeof errorData.error === 'object' &&
				errorData.error.message
			) {
				errorMessage = errorData.error.message;
			} else if (typeof errorData.error === 'string') {
				errorMessage = errorData.error;
			}
		}
		// Handle WordPress REST API format
		else if (errorData.message) {
			errorMessage = errorData.message;
		}
	} catch (parseError) {
		// If we can't parse the error, use the status-based message
		console.warn('Could not parse error response:', parseError);
	}

	return errorMessage;
}
