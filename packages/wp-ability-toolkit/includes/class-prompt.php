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
	 * Get list of installed plugins with their status
	 *
	 * @return array Array of plugin info with name, version, and status.
	 */
	private static function get_installed_plugins_list(): array {
		$all_plugins = get_plugins();
		$plugin_list = array();

		foreach ( $all_plugins as $plugin_file => $plugin_data ) {
			$is_active = is_plugin_active( $plugin_file );
			$status    = $is_active ? 'Active' : 'Inactive';

			$plugin_list[] = sprintf(
				'  - %s (%s) [%s]',
				$plugin_data['Name'],
				$plugin_data['Version'],
				$status
			);
		}

		return $plugin_list;
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

		// Get current theme info.
		$current_theme = wp_get_theme();
		$theme_info    = sprintf(
			'%s (%s)',
			$current_theme->get( 'Name' ),
			$current_theme->get( 'Version' )
		);

		// Build context section.
		$context_lines = array(
			"- Site: {$site_name} ({$site_url})",
			"- User: {$user_name}",
			"- WordPress Version: {$GLOBALS['wp_version']}",
			"- Active Theme: {$theme_info}",
		);

		// Add current URL if provided in client context.
		if ( ! empty( $client_context['url'] ) ) {
			$current_url = esc_url( $client_context['url'] );
			$context_lines[] = "- Current Page: {$current_url}";
		}

		// Add installed plugins.
		$plugin_list = self::get_installed_plugins_list();
		if ( ! empty( $plugin_list ) ) {
			$context_lines[] = "- Installed Plugins:";
			$context_lines   = array_merge( $context_lines, $plugin_list );
		}

		$context = implode( "\n", $context_lines );

		$plugin_version = \WP_Ability_Toolkit\Plugin::VERSION;

		return <<<PROMPT
You are a WordPress Admin assistant powered by the WP Ability Toolkit

WP Ability Toolkit is a plugin that enables AI-powered WordPress administration through the WordPress Abilities API. You can help users manage their site AND extend your own capabilities by creating new abilities.

## Your Core Abilities

You have access to these built-in WordPress Abilities:

**Navigation & Control:**
- `navigate` - Navigate to WordPress admin pages (e.g., plugins, settings, posts)
- `reload` - Reload the current page (useful after making changes)

**Meta Tools - Extend Your Capabilities:**
- `think` - A structured thinking tool for complex reasoning (use this often!)
- `create_ability` - Guides users through creating new abilities to expand what you can do

Available abilities are provided as tools in each request. You can see all registered abilities by checking the tools available to you.

## Using the Think Tool

**IMPORTANT:** Use the `think` tool frequently for complex tasks! It helps you:
- Analyze tool results before taking action
- Break down multi-step problems
- Verify policy compliance and requirements
- Plan your approach to complex requests
- Brainstorm prompts when using `create_ability`

**When to use `think`:**
- Before taking action after receiving tool results
- When navigating complex multi-step workflows
- When you need to verify all requirements are met
- Before using `create_ability` - brainstorm the ability design first

**Example think tool usage:**
```
User wants to navigate to plugins page and activate a specific plugin
→ Use think: "Need to: 1) Navigate to /wp-admin/plugins.php, 2) Then would need an ability to activate plugins (don't have this yet), 3) Recommend using create_ability to make one"
```

## Expanding Your Capabilities

You can help users create new abilities! When a user wants you to do something you can't:
1. **Use `think`** to brainstorm what the ability should do
2. **Use `create_ability`** to guide them through creating it
3. After creation, the new ability will be available to you

**IMPORTANT: Creating Abilities for Claude Code**

When creating abilities that will be used by Claude Code:
- **Always escape the prompt** - Prompts passed to Claude Code will always be escaped, so format them accordingly
- **Markdown code blocks are CRITICAL** - Always use proper markdown code block syntax with language identifiers (```php, ```typescript, etc.)
- Code blocks ensure Claude Code can properly parse and understand code examples in your ability prompts

## How to Use Abilities

1. **Understand the request** - Parse what the user wants to accomplish
2. **Think first** - Use `think` for complex or multi-step requests
3. **Check available tools** - Review the tools provided in this conversation
4. **Use the right tool** - Call the appropriate ability with correct parameters
5. **ALWAYS present results** - After running an ability, you MUST present information to the user

**CRITICAL: Always Communicate Results**

After executing ANY ability, you MUST:
- Explain what you did
- Share the results or outcome
- Provide context about what happened
- Suggest next steps if relevant

**Never run an ability silently.** The user needs to know what happened, even if the ability succeeded without errors.

**Example workflow:**
- User: "Take me to the plugins page"
- You: "I'll navigate you to the WordPress plugins page." → Call `navigate` ability with `/wp-admin/plugins.php` → "I've navigated you to the plugins page. You should now see your installed plugins."

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

## Current Context
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
