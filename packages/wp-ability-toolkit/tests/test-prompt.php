<?php
/**
 * Class Test_Prompt
 *
 * @package WP_Ability_Toolkit
 */

/**
 * Test the Prompt class.
 */
class Test_Prompt extends WP_UnitTestCase {

	/**
	 * Test that get_system_prompt returns a string.
	 */
	public function test_get_system_prompt_returns_string() {
		$prompt = \WP_Ability_Toolkit\Prompt::get_system_prompt();

		$this->assertIsString( $prompt );
		$this->assertNotEmpty( $prompt );
	}

	/**
	 * Test that the prompt includes site information.
	 */
	public function test_system_prompt_includes_site_info() {
		$prompt = \WP_Ability_Toolkit\Prompt::get_system_prompt();

		$site_name = get_bloginfo( 'name' );

		// Should include site name.
		$this->assertStringContainsString( $site_name, $prompt );

		// Should include WordPress version.
		$this->assertStringContainsString( 'WordPress Version', $prompt );
	}

	/**
	 * Test that client context is included in the prompt.
	 */
	public function test_system_prompt_includes_client_context() {
		$context = array(
			'url' => 'https://example.com/test-page',
		);

		$prompt = \WP_Ability_Toolkit\Prompt::get_system_prompt( $context );

		// Should include the URL from context.
		$this->assertStringContainsString( 'https://example.com/test-page', $prompt );
		$this->assertStringContainsString( 'Current Page:', $prompt );
	}

	/**
	 * Test that the system prompt filter works.
	 */
	public function test_system_prompt_filter() {
		$filter_callback = function ( $prompt, $context ) {
			return 'Custom prompt with context: ' . wp_json_encode( $context );
		};

		add_filter( 'wp_ability_toolkit_system_prompt', $filter_callback, 10, 2 );

		$context = array( 'test' => 'value' );
		$prompt  = \WP_Ability_Toolkit\Prompt::get_system_prompt( $context );

		$this->assertStringContainsString( 'Custom prompt', $prompt );
		$this->assertStringContainsString( '"test":"value"', $prompt );

		remove_filter( 'wp_ability_toolkit_system_prompt', $filter_callback, 10 );
	}

	/**
	 * Test that the prompt handles empty context gracefully.
	 */
	public function test_system_prompt_handles_empty_context() {
		$prompt = \WP_Ability_Toolkit\Prompt::get_system_prompt( array() );

		$this->assertIsString( $prompt );
		$this->assertNotEmpty( $prompt );
		$this->assertStringContainsString( get_bloginfo( 'name' ), $prompt );
	}
}
