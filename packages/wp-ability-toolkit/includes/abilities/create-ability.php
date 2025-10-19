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
			'description'         => __( 'Guides the user through defining requirements for a new WordPress Ability. You will help articulate what the ability should do and provide a prompt template for the user to give to Claude Code. NEVER write implementation code yourself - Claude Code handles all PHP/TypeScript implementation via the wordpress-ability-api skill.', 'wp-ability-toolkit' ),
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

**CRITICAL: Your Role vs Claude Code's Role**

- **You (WordPress AI)**: Brainstorm the concept - name, label, and explanation
- **Claude Code**: Determine and implement ALL technical details (schemas, callbacks, permissions, annotations, code)
- **NEVER specify schemas, callbacks, or implementation details yourself**

## Step 1: Use the Think Tool

Use the `think` tool to brainstorm with the user:
- What should this ability do? (in plain language)
- Server-side (PHP) or client-side (JavaScript)?
- What might it need as input? (conceptually, not schemas)
- What should it return? (conceptually, not schemas)
- Who should be able to use it? (user type, not code)

## Step 2: Define Name and Label

Work with the user to define:
- **Name**: Format "namespace/ability-name" (e.g., "my-plugin/send-notification")
  - Must be lowercase, hyphens, exactly one slash
  - Namespace should match plugin slug
- **Label**: Short human-readable name (e.g., "Send Notification")

## Step 3: Write a Brainstorm Explanation

Compose a 1-2 paragraph explanation that describes:
- What the ability does
- What kind of inputs it might accept (in plain language)
- What it returns (in plain language)
- Who should be able to use it
- Any important behavioral notes

## Step 4: Provide Prompt for Claude Code

**CRITICAL:** You MUST wrap the prompt in a markdown code block using triple backticks (```) so the user can easily copy it.

The format MUST be:

```
Activate the wordpress-ability-api skill and create this ability:

Name: [namespace/ability-name]
Label: [Human Readable Label]
Type: [server-side/client-side]

Explanation:
[Your 1-2 paragraph brainstorm explaining what it does, inputs, outputs, permissions, and behavior]
```

**DO NOT provide the prompt as plain text.** It MUST be in a markdown code block with triple backticks.

**Claude Code will handle all schemas, callbacks, permissions, and implementation.**

## Step 5: After Creation

Tell the user to reload this chat interface to see the new ability available.
INSTRUCTIONS;

				$next_steps = sprintf(
					'IMPORTANT: Have a converstation with the user to define th erequirements and clear up any confusion. Work together to define a clear name, label, and explanation (NOT schemas or code). Then provide a prompt template for the user to give to Claude Code, which will handle all implementation details. Use the `think` tool first to help brainstorm the concept for %s. ',
					esc_html( $ability_description )
				);

				return array(
					'instructions' => $instructions,
					'next_steps'   => $next_steps,
				);
			},
			'permission_callback' => function () {
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
