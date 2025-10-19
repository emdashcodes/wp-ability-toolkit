<?php
/**
 * Create Ability Meta-Ability
 *
 * A meta-ability that guides users through creating new WordPress Abilities
 * using the Claude Code wordpress-ability-api skill.
 *
 * @package WP_Ability_Toolkit
 */

namespace WP_Ability_Toolkit\Abilities;

/**
 * Register the create-ability meta-ability
 *
 * @return void
 */
function register_create_ability() {
	wp_register_ability(
		'wp-ability-toolkit/create-ability',
		array(
			'label'               => __( 'Create Ability', 'wp-ability-toolkit' ),
			'description'         => __( 'Guides the user through creating a new WordPress Ability using Claude Code skills. Use this when the user wants to extend the AI assistant\'s capabilities with new abilities. This will provide instructions for setting up the Claude Code wordpress-ability-api skill and crafting the right prompt.', 'wp-ability-toolkit' ),
			'category'            => 'meta-tools',
			'input_schema'        => array(
				'type'       => 'object',
				'properties' => array(
					'ability_description' => array(
						'type'        => 'string',
						'description' => 'Optional. A brief description of what the user wants the new ability to do.',
					),
				),
			),
			'output_schema'       => array(
				'type'       => 'object',
				'properties' => array(
					'instructions' => array(
						'type'        => 'string',
						'description' => 'Step-by-step instructions for creating the ability.',
					),
					'next_steps'   => array(
						'type'        => 'string',
						'description' => 'What the user should tell Claude Code next.',
					),
				),
			),
			'execute_callback'    => function ( $input ) {
				$ability_description = ! empty( $input['ability_description'] ) ? $input['ability_description'] : 'a new ability';

				$instructions = <<<'INSTRUCTIONS'
# Creating a New WordPress Ability

To create a new WordPress Ability, you'll use the Claude Code marketplace skills included in this repository.

## Step 1: Verify the wordpress-ability-api Skill is Available

The `wordpress-ability-api` skill should already be installed from the `emdashcodes/wp-ability-toolkit` marketplace.

If you need to install it manually:
```
/plugin install wordpress-ability-api@emdashcodes-wp-ability-toolkit
```

## Step 2: Use the Think Tool to Plan

Before creating the ability, use the `think` tool to:
- Define what the ability should do
- Determine if it should be server-side (PHP) or client-side (JavaScript)
- Identify what input parameters it needs
- Define what it should return
- Consider permissions and security

## Step 3: Tell Claude Code to Create the Ability

Once you've thought through the design, tell Claude Code to activate the wordpress-ability-api skill and create your ability.

Example prompt:
```
Activate the wordpress-ability-api skill and create a [server-side/client-side] ability that [description of what it should do].

It should:
- Accept [input parameters]
- Return [output data]
- Be available to [permission level]
- Belong to the [category-name] category
```

## Step 4: Test the Ability

After the ability is created and registered:
1. Reload this chat interface (or the WordPress admin page)
2. Try using the new ability in a conversation
3. Verify it works as expected

INSTRUCTIONS;

				$next_steps = sprintf(
					'I recommend using the `think` tool first to brainstorm the ability design for %s. Then, activate the wordpress-ability-api skill and provide a clear description of what you want the ability to do.',
					esc_html( $ability_description )
				);

				return array(
					'instructions' => $instructions,
					'next_steps'   => $next_steps,
				);
			},
			'permission_callback' => function () {
				// Require admin capabilities to create new abilities
				return current_user_can( 'manage_options' );
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
