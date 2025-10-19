<?php
/**
 * Ability Tools Manager
 * Handles conversion of WordPress abilities to AI tool formats
 *
 * @package WP_Ability_Toolkit
 */

namespace WP_Ability_Toolkit;

/**
 * Manages ability-to-tool conversion and execution
 */
class Ability_Tools_Manager {
	/**
	 * Client abilities passed from frontend
	 *
	 * @var array
	 */
	private $client_abilities = array();

	/**
	 * Get all server-side registered abilities
	 *
	 * @return array Array of WP_Ability objects.
	 */
	public function get_server_abilities() {
		if ( ! class_exists( 'WP_Abilities_Registry' ) ) {
			return array();
		}

		$registry = \WP_Abilities_Registry::get_instance();
		return $registry->get_all_registered();
	}

	/**
	 * Set client abilities from frontend
	 *
	 * @param array $abilities Array of client ability definitions.
	 */
	public function set_client_abilities( $abilities ) {
		$this->client_abilities = is_array( $abilities ) ? $abilities : array();
	}

	/**
	 * Sanitize ability name for use as tool name
	 * Converts namespace/ability-name to namespace__ability-name
	 *
	 * @param string $name Ability name with slash.
	 * @return string Sanitized tool name.
	 */
	public function sanitize_tool_name( $name ) {
		return str_replace( '/', '__', $name );
	}

	/**
	 * Unsanitize tool name back to ability name
	 * Converts namespace__ability-name to namespace/ability-name
	 *
	 * @param string $name Tool name with double underscore.
	 * @return string Original ability name.
	 */
	public function unsanitize_tool_name( $name ) {
		return str_replace( '__', '/', $name );
	}

	/**
	 * Merge server and client abilities
	 *
	 * @return array Combined abilities array.
	 */
	public function get_all_abilities() {
		$server_abilities = $this->get_server_abilities();
		$merged = array();

		// Add server abilities.
		foreach ( $server_abilities as $ability ) {
			$merged[] = array(
				'name'          => $ability->get_name(),
				'label'         => $ability->get_label(),
				'description'   => $ability->get_description(),
				'category'      => $ability->get_category(),
				'input_schema'  => $ability->get_input_schema(),
				'output_schema' => $ability->get_output_schema(),
				'is_client'     => false,
			);
		}

		// Add client abilities.
		foreach ( $this->client_abilities as $ability ) {
			if ( isset( $ability['name'] ) ) {
				$merged[] = array_merge(
					$ability,
					array( 'is_client' => true )
				);
			}
		}

		return $merged;
	}

	/**
	 * Convert abilities to OpenAI tool format
	 *
	 * @return array OpenAI tools array.
	 */
	public function convert_to_openai_tools() {
		$abilities = $this->get_all_abilities();
		$tools = array();

		foreach ( $abilities as $ability ) {
			// Get input schema and ensure properties is an object, not array.
			$input_schema = $ability['input_schema'] ?? array(
				'type'       => 'object',
				'properties' => new \stdClass(),
			);

			// Fix empty arrays in properties (PHP converts {} to []).
			if ( isset( $input_schema['properties'] ) && is_array( $input_schema['properties'] ) && empty( $input_schema['properties'] ) ) {
				$input_schema['properties'] = new \stdClass();
			}

			$tools[] = array(
				'type'     => 'function',
				'function' => array(
					'name'        => $this->sanitize_tool_name( $ability['name'] ),
					'description' => $ability['description'] ?? $ability['label'],
					'parameters'  => $input_schema,
				),
			);
		}

		return $tools;
	}

	/**
	 * Convert abilities to Anthropic tool format
	 *
	 * @return array Anthropic tools array.
	 */
	public function convert_to_anthropic_tools() {
		$abilities = $this->get_all_abilities();
		$tools = array();

		foreach ( $abilities as $ability ) {
			// Get input schema and ensure properties is an object, not array.
			$input_schema = $ability['input_schema'] ?? array(
				'type'       => 'object',
				'properties' => new \stdClass(),
			);

			// Fix empty arrays in properties (PHP converts {} to []).
			if ( isset( $input_schema['properties'] ) && is_array( $input_schema['properties'] ) && empty( $input_schema['properties'] ) ) {
				$input_schema['properties'] = new \stdClass();
			}

			$tools[] = array(
				'name'         => $this->sanitize_tool_name( $ability['name'] ),
				'description'  => $ability['description'] ?? $ability['label'],
				'input_schema' => $input_schema,
			);
		}

		return $tools;
	}

	/**
	 * Check if a tool is client-side
	 *
	 * @param string $name Tool name (may be sanitized).
	 * @return bool True if client-side tool.
	 */
	public function is_client_tool( $name ) {
		// Convert sanitized name back to ability name.
		$ability_name = $this->unsanitize_tool_name( $name );

		foreach ( $this->client_abilities as $ability ) {
			if ( isset( $ability['name'] ) && $ability['name'] === $ability_name ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Execute a server-side tool
	 *
	 * @param string $name  Tool name (may be sanitized).
	 * @param array  $input Tool input parameters.
	 * @return mixed Tool execution result or WP_Error.
	 */
	public function execute_server_tool( $name, $input = array() ) {
		// Convert sanitized tool name back to ability name.
		$ability_name = $this->unsanitize_tool_name( $name );

		// Get the ability.
		$ability = wp_get_ability( $ability_name );

		if ( ! $ability ) {
			return new \WP_Error(
				'tool_not_found',
				sprintf( 'Tool "%s" not found', $name )
			);
		}

		// Check if it's a client tool (shouldn't be executed server-side).
		if ( $this->is_client_tool( $name ) ) {
			return new \WP_Error(
				'client_tool_execution',
				sprintf( 'Tool "%s" is a client-side tool and cannot be executed on the server', $name )
			);
		}

		// Execute with current user context.
		try {
			$result = $ability->execute( $input );

			// Handle WP_Error responses.
			if ( is_wp_error( $result ) ) {
				return $result;
			}

			return $result;
		} catch ( \Exception $e ) {
			return new \WP_Error(
				'tool_execution_error',
				sprintf( 'Error executing tool "%s": %s', $name, $e->getMessage() )
			);
		}
	}

	/**
	 * Format tool result for AI consumption
	 *
	 * @param mixed $result Tool execution result.
	 * @return string JSON-encoded result.
	 */
	public function format_tool_result( $result ) {
		// Handle WP_Error.
		if ( is_wp_error( $result ) ) {
			return wp_json_encode(
				array(
					'error' => array(
						'code'    => $result->get_error_code(),
						'message' => $result->get_error_message(),
						'data'    => $result->get_error_data(),
					),
				)
			);
		}

		// Handle arrays and objects.
		if ( is_array( $result ) || is_object( $result ) ) {
			return wp_json_encode( $result );
		}

		// Handle scalar values.
		return wp_json_encode( array( 'result' => $result ) );
	}
}
