<?php
/**
 * Think Ability
 *
 * A meta-ability that provides structured thinking space for the AI agent.
 * Based on Anthropic's "think" tool pattern for improved reasoning in complex
 * tool use scenarios.
 *
 * @package WP_Ability_Toolkit
 * @see https://www.anthropic.com/engineering/claude-think-tool
 */

namespace WP_Ability_Toolkit\Abilities;

/**
 * Register the think ability
 *
 * @return void
 */
function register_think_ability() {
	wp_register_ability(
		'wp-ability-toolkit/think',
		array(
			'label'               => __( 'Think', 'wp-ability-toolkit' ),
			'description'         => __( 'Use this tool to think about something. It will not obtain new information or change the database, but just append the thought to the log. Use it when complex reasoning or some cache memory is needed. **IMPORTANT**: Always use markdown formatting in your thoughts.', 'wp-ability-toolkit' ),
			'category'            => 'meta-tools',
			'input_schema'        => array(
				'type'       => 'object',
				'properties' => array(
					'thought' => array(
						'type'        => 'string',
						'description' => 'A thought to think about. Always use markdown formatting.',
					),
				),
				'required'   => array( 'thought' ),
			),
			'output_schema'       => array(
				'type'       => 'object',
				'properties' => array(
					'thought' => array(
						'type'        => 'string',
						'description' => 'The thought that was logged.',
					),
				),
			),
			'execute_callback'    => function ( $input ) {
				return array(
					'thought' => $input['thought'],
				);
			},
			'permission_callback' => function () {
				return is_user_logged_in();
			},
			'meta'                => array(
				'show_in_rest' => true,
				'annotations'  => array(
					'readonly'    => true,
					'destructive' => false,
					'idempotent'  => true,
				),
			),
		)
	);
}
