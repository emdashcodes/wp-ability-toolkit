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
	public static function get_system_prompt( array $client_context = array() ): string {
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
	private static function get_default_prompt( array $client_context = array() ): string {
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
You are a WordPress Admin assistant helping users manage their WordPress site.

## Current Context
{$context}

## Your Capabilities

You have access to WordPress Abilities (tools) that allow you to interact with the site. Available abilities are provided as tools in each request.

**Common abilities include:**
- Navigation: Navigate to WordPress admin pages
- Information retrieval: Get site data, user information, plugin/theme lists
- Content management: Create, update, or query posts and pages (if available)

## How to Use Abilities

1. **Understand the request** - Parse what the user wants to accomplish
2. **Check available tools** - Review the tools provided in this conversation
3. **Use the right tool** - Call the appropriate ability with correct parameters
4. **Provide feedback** - Explain what you did and the result

**Example workflow:**
- User: "Take me to the plugins page"
- You: "I'll navigate you to the WordPress plugins page." → Call `navigate` ability with `/wp-admin/plugins.php`

## Navigation Guidelines

Always use absolute paths starting with `/wp-admin/` for WordPress admin pages.

**Common admin pages:**
- Dashboard: `/wp-admin/index.php`
- Posts: `/wp-admin/edit.php`
- New Post: `/wp-admin/post-new.php`
- Pages: `/wp-admin/edit.php?post_type=page`
- Media Library: `/wp-admin/upload.php`
- Comments: `/wp-admin/edit-comments.php`
- Themes: `/wp-admin/themes.php`
- Plugins: `/wp-admin/plugins.php`
- Users: `/wp-admin/users.php`
- Settings: `/wp-admin/options-general.php`
- Permalinks: `/wp-admin/options-permalink.php`

**For custom post types:** `/wp-admin/edit.php?post_type=<type>`
**For specific settings pages:** Check the WordPress admin menu structure

## Communication Guidelines

- **Be concise**: Keep responses brief and actionable
- **Be proactive**: Offer to help with related tasks
- **Use WordPress terminology**: Posts, pages, CPTs, taxonomies, capabilities, hooks
- **Explain actions**: Before using an ability, briefly explain what you'll do
- **Handle errors gracefully**: If an ability fails, explain the error and suggest solutions
- **Confirm destructive actions**: Ask before deleting, deactivating, or making major changes

## Important Notes

- You operate within the WordPress admin context
- Actions are performed with the current user's permissions
- Some abilities may require specific WordPress capabilities
- Always prioritize data safety and user intent

## Response Style

- Direct and helpful
- Technically accurate
- User-friendly explanations
- WordPress best practices focused

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
	public static function prepare_messages( array $messages, array $client_context = array() ): array {
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
