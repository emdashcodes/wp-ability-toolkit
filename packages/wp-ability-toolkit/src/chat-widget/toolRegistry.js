/**
 * Tool Registry
 * Manages client-side WordPress abilities as tools
 */
// Import WordPress abilities client
// @ts-ignore - WordPress abilities may not have types
import { getAbilities, executeAbility } from '@wordpress/abilities';
/**
 * Get all client-registered abilities
 * These are abilities registered in JavaScript that run in the browser
 */
export async function getAllClientAbilities() {
	try {
		// Get all abilities (server + client)
		const abilities = await getAbilities();
		// Filter to only client-side abilities (those with callbacks)
		// and serialize them (remove callback function)
		return abilities
			.filter((ability) => typeof ability.callback === 'function')
			.map((ability) => ({
				name: ability.name,
				label: ability.label,
				description: ability.description,
				category: ability.category,
				input_schema: ability.input_schema,
				output_schema: ability.output_schema,
			}));
	} catch (error) {
		console.error('Failed to load client abilities:', error);
		return [];
	}
}
/**
 * Execute a client-side ability
 *
 * @param name  Ability name
 * @param input Ability input parameters
 * @returns Promise with the execution result
 */
export async function executeClientAbility(name, input) {
	try {
		const result = await executeAbility(name, input);
		return result;
	} catch (error) {
		console.error(`Failed to execute ability ${name}:`, error);
		throw error;
	}
}
/**
 * Execute a tool call and return formatted result
 *
 * @param toolCall Tool call object from AI
 * @returns Promise with tool result
 */
export async function executeToolCall(toolCall) {
	try {
		const output = await executeClientAbility(
			toolCall.name,
			toolCall.input
		);
		return {
			id: toolCall.id,
			name: toolCall.name,
			output,
		};
	} catch (error) {
		return {
			id: toolCall.id,
			name: toolCall.name,
			output: null,
			error:
				error instanceof Error
					? error.message
					: 'Unknown error executing tool',
		};
	}
}
//# sourceMappingURL=toolRegistry.js.map
