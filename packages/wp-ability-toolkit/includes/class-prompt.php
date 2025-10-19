<?php
/**
 * System Prompt Manager
 *
 * @package WP_Ability_Toolkit
 */

namespace WP_Ability_Toolkit;

/**
 * Manages the system prompt for the AI agent
 */
class Prompt {
	/**
	 * Get the system prompt
	 *
	 * @param array $client_context Client context data (e.g., url, viewport, etc.).
	 * @return string The system prompt.
	 */
	public static function get_system_prompt( $client_context = array() ) {
		/**
		 * Filter the system prompt for the AI agent.
		 *
		 * @param string $prompt The default system prompt.
		 * @param array  $client_context Client context data.
		 */
		return apply_filters( 'wp_ability_toolkit_system_prompt', self::get_default_prompt( $client_context ), $client_context );
	}

	/**
	 * Get the default system prompt
	 *
	 * @param array $client_context Client context data (e.g., url, viewport, etc.).
	 * @return string The default system prompt.
	 */
	private static function get_default_prompt( $client_context = array() ) {
		$site_name = get_bloginfo( 'name' );
		$site_url  = get_bloginfo( 'url' );
		$user      = wp_get_current_user();
		$user_name = $user->display_name;

		// Build context section.
		$context_lines = array(
			"- Site: {$site_name} ({$site_url})",
			"- User: {$user_name}",
			"- WordPress Version: {$GLOBALS['wp_version']}",
		);

		// Add current URL if provided in client context.
		if ( ! empty( $client_context['url'] ) ) {
			$current_url = esc_url( $client_context['url'] );
			$context_lines[] = "- Current Page: {$current_url}";
		}

		$context = implode( "\n", $context_lines );

		return <<<PROMPT
You are a helpful WordPress Admin assistant.

## Your Role
You help users manage their WordPress site through conversation. You can:
- Navigate to different admin pages
- Answer questions about WordPress
- Help with site configuration and management
- Provide guidance on WordPress best practices

## Abilities Available
You have access to WordPress abilities (tools) that let you interact with the site. When a user asks you to do something:

1. **Check available abilities** - Look at the tools provided to see what actions you can perform
2. **Use abilities when appropriate** - If there's an ability that matches the user's request, use it
3. **Navigate intelligently** - When asked to "go to" or "show me" a page, use the navigate ability
4. **Explain actions** - Tell the user what you're about to do before using an ability
5. **Handle errors gracefully** - If an ability fails, explain what went wrong and suggest alternatives

## Navigation
When navigating, always use complete paths starting with `/wp-admin/`. Common WordPress admin pages:
- Dashboard: `/wp-admin/index.php`
- Posts: `/wp-admin/edit.php`
- Pages: `/wp-admin/edit.php?post_type=page`
- Media: `/wp-admin/upload.php`
- Plugins: `/wp-admin/plugins.php`
- Themes: `/wp-admin/themes.php`
- Users: `/wp-admin/users.php`
- Settings: `/wp-admin/options-general.php`

## Communication Style
- Be concise and helpful
- Use WordPress terminology correctly
- Provide context when making changes
- Ask for confirmation before destructive actions
- Explain technical concepts in accessible terms

## Context
{$context}
PROMPT;
	}

	/**
	 * Prepare messages with system prompt
	 *
	 * Injects the system prompt as the first message if not already present.
	 *
	 * @param array $messages Array of messages.
	 * @param array $client_context Client context data (e.g., url, viewport, etc.).
	 * @return array Messages with system prompt prepended.
	 */
	public static function prepare_messages( $messages, $client_context = array() ) {
		// Check if first message is already a system message.
		if ( ! empty( $messages ) && isset( $messages[0]['role'] ) && 'system' === $messages[0]['role'] ) {
			return $messages;
		}

		// Prepend system message.
		$system_message = array(
			'role'    => 'system',
			'content' => self::get_system_prompt( $client_context ),
		);

		return array_merge( array( $system_message ), $messages );
	}
}
