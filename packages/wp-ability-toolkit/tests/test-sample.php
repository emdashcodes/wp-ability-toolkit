<?php
/**
 * Class SampleTest
 *
 * @package Wp_Ability_Tester
 */

/**
 * Sample test case.
 */
class SampleTest extends WP_UnitTestCase {

	/**
	 * Test WordPress is loaded.
	 */
	public function test_wordpress_loaded() {
		$this->assertTrue( function_exists( 'wp_get_current_user' ) );
	}

	/**
	 * Test WP_Ability class exists.
	 */
	public function test_wp_ability_exists() {
		$this->assertTrue( class_exists( 'WP_Ability' ), 'WP_Ability class should exist' );
	}

	/**
	 * Test WP_Ability_Toolkit autoloader is registered.
	 */
	public function test_plugin_classes_exist() {
		$this->assertTrue( class_exists( 'WP_Ability_Toolkit\Prompt' ), 'WP_Ability_Toolkit\Prompt class should exist' );
	}
}
