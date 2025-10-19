<?php
/**
 * Register ability category: {{LABEL}}
 *
 * {{DESCRIPTION}}
 */

/**
 * Hook: abilities_api_categories_init
 * Categories must be registered BEFORE abilities that use them.
 * This hook fires before 'abilities_api_init'.
 */
add_action( 'abilities_api_categories_init', '{{REGISTER_FUNCTION}}' );

function {{REGISTER_FUNCTION}}() {
	wp_register_ability_category( '{{CATEGORY_NAME}}', array(
		'label'       => __( '{{LABEL}}', '{{NAMESPACE}}' ),
		'description' => __( '{{DESCRIPTION}}', '{{NAMESPACE}}' ),
	) );
}
