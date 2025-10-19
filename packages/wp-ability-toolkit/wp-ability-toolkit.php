<?php
/**
 * Plugin Name:     AI Ability Toolkit for WordPress
 * Plugin URI:      https://github.com/emdash/wp-ability-toolkit
 * Description:     Test and develop WordPress Ability API integrations with AI agents
 * Author:          Em
 * Author URI:      https://github.com/emdash
 * Text Domain:     wp-ability-toolkit
 * Domain Path:     /languages
 * Version:         0.1.0
 *
 * @package         WP_Ability_Toolkit
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Load Composer dependencies.
if ( file_exists( __DIR__ . '/vendor/autoload.php' ) ) {
	require_once __DIR__ . '/vendor/autoload.php';
}

// Check if Abilities API is available.
if ( ! class_exists( 'WP_Ability' ) ) {
	add_action(
		'admin_notices',
		function () {
			echo '<div class="notice notice-error"><p>';
			echo wp_kses_post(
				sprintf(
					/* translators: %s: command to run */
					__( 'AI Ability Toolkit requires the WordPress Ability API. Please run %s in the plugin directory.', 'wp-ability-toolkit' ),
					'<code>composer install</code>'
				)
			);
			echo '</p></div>';
		}
	);
	return;
}

// Autoload classes.
spl_autoload_register(
	function ( $class ) {
		$prefix = 'WP_Ability_Toolkit\\';
		$base_dir = __DIR__ . '/includes/';

		$len = strlen( $prefix );
		if ( strncmp( $prefix, $class, $len ) !== 0 ) {
			return;
		}

		$relative_class = substr( $class, $len );
		$file = $base_dir . 'class-' . str_replace( '_', '-', strtolower( $relative_class ) ) . '.php';

		if ( file_exists( $file ) ) {
			require $file;
		}
	}
);

// Initialize plugin.
add_action(
	'plugins_loaded',
	function () {
		\WP_Ability_Toolkit\Plugin::get_instance( __FILE__ )->init();
	}
);
