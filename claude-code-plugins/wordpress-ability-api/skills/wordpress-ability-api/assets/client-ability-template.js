/**
 * Client-Side Ability: {{LABEL}}
 *
 * {{DESCRIPTION}}
 */

import { registerAbility } from '@wordpress/abilities';

/**
 * Register the {{ABILITY_NAME}} ability.
 */
registerAbility( {
	name: '{{ABILITY_NAME}}',
	label: '{{LABEL}}',
	description: '{{DESCRIPTION}}',
	category: '{{CATEGORY}}',

	// Define expected input structure using JSON Schema
	inputSchema: {
		type: 'object',
		properties: {
			// TODO: Define input parameters
			// param1: {
			// 	type: 'string',
			// 	description: 'Description of parameter',
			// },
		},
		required: [], // TODO: List required parameters
		additionalProperties: false,
	},

	// Define output structure using JSON Schema
	outputSchema: {
		type: 'object',
		properties: {
			result: {
				type: 'string',
				description: 'The result of the operation',
			},
		},
	},

	// The async callback function to execute
	callback: async ( input ) => {
		// TODO: Implement your ability logic here

		// Example error handling:
		// if ( ! someValidation( input ) ) {
		// 	throw new Error( 'The provided input is invalid.' );
		// }

		return {
			result: 'TODO: Implement logic',
		};
	},

	// Permission check callback
	permissionCallback: ( input ) => {
		// TODO: Implement appropriate permission checks
		// Examples:
		// return window.wp?.data?.select('core')?.getCurrentUser() !== null;
		return true; // Everyone can access (use with caution!)
	},

	// Metadata
	meta: {
		annotations: {
			readonly: {{READONLY}},
			destructive: {{DESTRUCTIVE}},
			idempotent: {{IDEMPOTENT}},
		},
	},
} );
