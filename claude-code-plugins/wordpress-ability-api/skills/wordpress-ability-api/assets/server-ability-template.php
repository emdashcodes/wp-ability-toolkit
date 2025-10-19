<?php
/**
 * Ability: {{LABEL}}
 *
 * {{DESCRIPTION}}
 */

/**
 * Execute callback for {{ABILITY_NAME}} ability.
 *
 * @param array|mixed $input Input data matching the input_schema.
 * @return mixed Output data matching the output_schema, or WP_Error on failure.
 */
function {{CALLBACK_FUNCTION}}( $input ) {
	// TODO: Implement your ability logic here

	// Example error handling:
	// if ( ! some_validation( $input ) ) {
	// 	return new WP_Error(
	// 		'invalid_input',
	// 		__( 'The provided input is invalid.', '{{NAMESPACE}}' )
	// 	);
	// }

	return array(
		'result' => 'TODO: Implement logic',
	);
}

/**
 * Register the {{ABILITY_NAME}} ability.
 */
add_action( 'abilities_api_init', '{{REGISTER_FUNCTION}}' );

function {{REGISTER_FUNCTION}}() {
	wp_register_ability( '{{ABILITY_NAME}}', array(
		'label'       => __( '{{LABEL}}', '{{NAMESPACE}}' ),
		'description' => __( '{{DESCRIPTION}}', '{{NAMESPACE}}' ),
		'category'    => '{{CATEGORY}}',

		// Define expected input structure using JSON Schema
		'input_schema' => array(
			'type'       => 'object',
			'properties' => array(
				// TODO: Define input parameters
				// 'param1' => array(
				// 	'type'        => 'string',
				// 	'description' => __( 'Description of parameter', '{{NAMESPACE}}' ),
				// ),
			),
			'required'             => array(), // TODO: List required parameters
			'additionalProperties' => false,
		),

		// Define output structure using JSON Schema
		'output_schema' => array(
			'type'       => 'object',
			'properties' => array(
				'result' => array(
					'type'        => 'string',
					'description' => __( 'The result of the operation', '{{NAMESPACE}}' ),
				),
			),
		),

		// The callback function to execute
		'execute_callback' => '{{CALLBACK_FUNCTION}}',

		// Permission check callback
		'permission_callback' => function( $input ) {
			// TODO: Implement appropriate permission checks
			// Examples:
			// return current_user_can( 'manage_options' );
			// return is_user_logged_in();
			return __return_true(); // Everyone can access (use with caution!)
		},

		// Metadata
		'meta' => array(
			'show_in_rest' => true,
			'annotations'  => array(
				'readonly'    => {{READONLY}},
				'destructive' => {{DESTRUCTIVE}},
				'idempotent'  => {{IDEMPOTENT}},
			),
		),
	) );
}
