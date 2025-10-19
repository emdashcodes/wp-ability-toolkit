/**
 * Tool Registry
 * Manages client-side WordPress abilities as tools
 */
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
export declare function getAllClientAbilities(): Promise<ClientAbility[]>;
/**
 * Execute a client-side ability
 *
 * @param name  Ability name
 * @param input Ability input parameters
 * @returns Promise with the execution result
 */
export declare function executeClientAbility(
	name: string,
	input: any
): Promise<any>;
/**
 * Execute a tool call and return formatted result
 *
 * @param toolCall Tool call object from AI
 * @returns Promise with tool result
 */
export declare function executeToolCall(
	toolCall: ToolCall
): Promise<ToolResult>;
//# sourceMappingURL=toolRegistry.d.ts.map
