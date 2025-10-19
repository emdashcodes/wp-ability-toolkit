<?php
/**
 * PHPUnit bootstrap file.
 *
 * @package Wp_Ability_Tester
 */

$_tests_dir = getenv( 'WP_TESTS_DIR' );

if ( ! $_tests_dir ) {
	$_tests_dir = rtrim( sys_get_temp_dir(), '/\\' ) . '/wordpress-tests-lib';
}

// Forward custom PHPUnit Polyfills configuration to PHPUnit bootstrap file.
$_phpunit_polyfills_path = getenv( 'WP_TESTS_PHPUNIT_POLYFILLS_PATH' );
if ( false !== $_phpunit_polyfills_path ) {
	define( 'WP_TESTS_PHPUNIT_POLYFILLS_PATH', $_phpunit_polyfills_path );
}

if ( ! file_exists( "{$_tests_dir}/includes/functions.php" ) ) {
	echo "Could not find {$_tests_dir}/includes/functions.php, have you run bin/install-wp-tests.sh ?" . PHP_EOL; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	exit( 1 );
}

// Load PHPUnit Polyfills.
require_once dirname( dirname( __FILE__ ) ) . '/vendor/yoast/phpunit-polyfills/phpunitpolyfills-autoload.php';

// Give access to tests_add_filter() function.
require_once "{$_tests_dir}/includes/functions.php";

/**
 * Manually load the plugins being tested.
 */
function _manually_load_plugin() {
	// Manually load the abilities-api classes.
	// The abilities-api bootstrap.php returns early when loaded via Composer autoloader,
	// so we need to manually load the required files for testing.
	$abilities_api_dir = dirname( dirname( __FILE__ ) ) . '/vendor/wordpress/abilities-api';
	$includes_dir = $abilities_api_dir . '/includes';

	// Define version constant from composer.json.
	if ( ! defined( 'WP_ABILITIES_API_VERSION' ) ) {
		$composer_json_path = $abilities_api_dir . '/composer.json';
		if ( file_exists( $composer_json_path ) ) {
			$composer_data = json_decode( file_get_contents( $composer_json_path ), true );
			$version = isset( $composer_data['version'] ) ? $composer_data['version'] : '0.0.0';
			define( 'WP_ABILITIES_API_VERSION', $version );
		} else {
			define( 'WP_ABILITIES_API_VERSION', '0.0.0' );
		}
	}

	// Load core classes.
	require_once $includes_dir . '/abilities-api/class-wp-ability.php';
	require_once $includes_dir . '/abilities-api/class-wp-abilities-registry.php';
	require_once $includes_dir . '/abilities-api/class-wp-ability-category.php';
	require_once $includes_dir . '/abilities-api/class-wp-abilities-category-registry.php';
	require_once $includes_dir . '/abilities-api.php';
	require_once $includes_dir . '/rest-api/class-wp-rest-abilities-init.php';
	require_once $includes_dir . '/assets/class-wp-abilities-assets-init.php';

	// Load the main plugin being tested.
	require dirname( dirname( __FILE__ ) ) . '/wp-ability-toolkit.php';
}

tests_add_filter( 'muplugins_loaded', '_manually_load_plugin' );

// Start up the WP testing environment.
require "{$_tests_dir}/includes/bootstrap.php";
