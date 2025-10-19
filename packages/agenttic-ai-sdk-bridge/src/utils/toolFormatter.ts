/**
 * Format tool result for display in chat
 */
import type { ToolResult } from '../toolRegistry.js';

export function formatToolContent(toolResult: ToolResult): string {
	// If the tool result contains an error field, format it prominently
	if (
		toolResult.output &&
		typeof toolResult.output === 'object' &&
		'error' in toolResult.output
	) {
		return `ERROR: ${toolResult.output.error}\n\n${JSON.stringify(toolResult.output, null, 2)}`;
	}

	// If there's a direct error, show it
	if (toolResult.error) {
		return `ERROR: ${toolResult.error}`;
	}

	// Otherwise, stringify the output
	return JSON.stringify(toolResult.output);
}
