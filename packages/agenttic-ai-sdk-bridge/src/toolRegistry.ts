/**
 * Tool Registry
 * Manages client-side WordPress abilities as tools
 */

// Import WordPress abilities client
// @ts-ignore - WordPress abilities may not have types
import { getAbilities, executeAbility } from '@wordpress/abilities';

/**
 * Client ability definition (serializable, without callback)
 */
export interface ClientAbility {
	name: string;
	label: string;
	description: string;
	category?: string;
	input_schema?: any;
	output_schema?: any;
}

/**
 * Tool call from AI
 */
export interface ToolCall {
	id: string;
	name: string;
	input: any;
}

/**
 * Tool execution result
 */
export interface ToolResult {
	id: string;
	name: string;
	output: any;
	error?: string;
}

/**
 * Get all client-registered abilities
 * These are abilities registered in JavaScript that run in the browser
 */
export async function getAllClientAbilities(): Promise<ClientAbility[]> {
	try {
		// Get all abilities (server + client)
		const abilities = await getAbilities();
		console.log('[Tool Registry] All abilities:', abilities.length);

		// Filter to only client-side abilities (those with callbacks)
		// and serialize them (remove callback function)
		const clientAbilities = abilities.filter(
			(ability: any) => typeof ability.callback === 'function'
		);
		console.log(
			'[Tool Registry] Client abilities found:',
			clientAbilities.length,
			clientAbilities.map((a: any) => a.name)
		);

		return clientAbilities.map((ability: any) => ({
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
export async function executeClientAbility(
	name: string,
	input: any
): Promise<any> {
	try {
		// Ensure input is always a plain object (not array, not null)
		// Arrays and null will be converted to empty object
		const abilityInput =
			input && typeof input === 'object' && !Array.isArray(input)
				? input
				: {};
		console.log(
			`[Tool Registry] Executing ability ${name} with input:`,
			abilityInput
		);

		const result = await executeAbility(name, abilityInput);
		console.log(`[Tool Registry] Ability ${name} result:`, result);
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
export async function executeToolCall(toolCall: ToolCall): Promise<ToolResult> {
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
