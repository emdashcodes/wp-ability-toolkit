<?php
/**
 * REST API endpoints for AI Ability Toolkit
 *
 * @package WP_Ability_Toolkit
 */

namespace WP_Ability_Toolkit;

/**
 * Handles REST API endpoints
 */
class REST_API {
	/**
	 * Settings instance
	 *
	 * @var Settings
	 */
	private $settings;

	/**
	 * Constructor
	 *
	 * @param Settings $settings Settings instance.
	 */
	public function __construct( Settings $settings ) {
		$this->settings = $settings;
	}

	/**
	 * Register REST API routes
	 */
	public function register_routes() {
		register_rest_route(
			'wp-ability-toolkit/v1',
			'/chat',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'handle_chat' ),
				'permission_callback' => function () {
					// Allow filtering the required capability for chat access.
					$required_capability = apply_filters( 'wp_ability_toolkit_chat_capability', 'manage_options' );
					return current_user_can( $required_capability );
				},
				'args'                => array(
					'messages'         => array(
						'required'          => true,
						'type'              => 'array',
						'validate_callback' => array( $this, 'validate_messages' ),
						'sanitize_callback' => array( $this, 'sanitize_messages' ),
					),
					'clientContext'    => array(
						'type'    => 'object',
						'default' => array(),
					),
					'clientAbilities'  => array(
						'type'    => 'array',
						'default' => array(),
					),
				),
			)
		);

		register_rest_route(
			'wp-ability-toolkit/v1',
			'/settings',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'save_settings' ),
				'permission_callback' => function () {
					return current_user_can( 'manage_options' );
				},
			)
		);

		register_rest_route(
			'wp-ability-toolkit/v1',
			'/settings',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_settings' ),
				'permission_callback' => function () {
					return current_user_can( 'manage_options' );
				},
			)
		);
	}

	/**
	 * Validate messages array structure
	 *
	 * @param array $messages Messages array.
	 * @return bool|\WP_Error True if valid, WP_Error otherwise.
	 */
	public function validate_messages( $messages ) {
		if ( ! is_array( $messages ) || empty( $messages ) ) {
			return new \WP_Error( 'invalid_messages', 'Messages must be a non-empty array' );
		}

		$valid_roles = array( 'system', 'user', 'assistant', 'tool' );

		foreach ( $messages as $index => $message ) {
			if ( ! is_array( $message ) ) {
				return new \WP_Error( 'invalid_message_format', "Message at index {$index} must be an object" );
			}

			if ( ! isset( $message['role'] ) || ! isset( $message['content'] ) ) {
				return new \WP_Error( 'missing_fields', "Message at index {$index} must have 'role' and 'content' fields" );
			}

			if ( ! in_array( $message['role'], $valid_roles, true ) ) {
				return new \WP_Error( 'invalid_role', "Message at index {$index} has invalid role: {$message['role']}" );
			}

			// Validate content length (50,000 chars max).
			if ( is_string( $message['content'] ) && strlen( $message['content'] ) > 50000 ) {
				return new \WP_Error( 'content_too_long', "Message at index {$index} exceeds maximum length of 50,000 characters" );
			}
		}

		return true;
	}

	/**
	 * Sanitize messages array
	 *
	 * @param array $messages Messages array.
	 * @return array Sanitized messages.
	 */
	public function sanitize_messages( $messages ) {
		// Messages are already validated, so just return as-is.
		// Content sanitization is handled by the AI clients.
		return $messages;
	}

	/**
	 * Handle chat endpoint
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response Response object.
	 */
	public function handle_chat( $request ) {
		$messages = $request->get_param( 'messages' );

		$provider = $this->settings->get_provider();
		$api_key  = $this->settings->get_api_key();
		$model    = $this->settings->get_model();

		if ( empty( $api_key ) ) {
			// Check if there's an encrypted key stored but it failed to decrypt.
			$has_stored_key = ! empty( get_option( Settings::OPTION_API_KEY, '' ) );

			if ( $has_stored_key ) {
				return new \WP_REST_Response(
					array( 'error' => 'Failed to decrypt API key. The encryption format may have changed. Please re-enter your API key in Settings.' ),
					400
				);
			}

			return new \WP_REST_Response(
				array( 'error' => 'API key not configured. Please configure your API key in Settings > AI Ability Toolkit.' ),
				400
			);
		}

		// Get client context if provided.
		$client_context = $request->get_param( 'clientContext' );
		if ( empty( $client_context ) || ! is_array( $client_context ) ) {
			$client_context = array();
		}

		// Prepare messages with system prompt.
		$messages = Prompt::prepare_messages( $messages, $client_context );

		// Initialize Ability Tools Manager.
		$tools_manager = new Ability_Tools_Manager();

		// Set client abilities if provided.
		$client_abilities = $request->get_param( 'clientAbilities' );
		if ( ! empty( $client_abilities ) && is_array( $client_abilities ) ) {
			$tools_manager->set_client_abilities( $client_abilities );
		}

		try {
			if ( 'openai' === $provider ) {
				$client = new OpenAI_Client( $api_key );
				return $client->stream_chat( $model, $messages, $tools_manager );
			} else {
				$client = new Anthropic_Client( $api_key );
				return $client->stream_chat( $model, $messages, $tools_manager );
			}
		} catch ( \Exception $e ) {
			// Log the error for debugging.
			error_log( 'AI Ability Toolkit error: ' . $e->getMessage() );

			// Return user-friendly error.
			$error_message = $e->getMessage();
			$status_code = 500;

			// Detect authentication errors.
			if ( stripos( $error_message, 'unauthorized' ) !== false ||
				 stripos( $error_message, 'invalid api key' ) !== false ||
				 stripos( $error_message, 'authentication' ) !== false ||
				 stripos( $error_message, '401' ) !== false ) {
				$status_code = 401;
				$error_message = 'Invalid API key. Please check your API key in Settings > AI Ability Toolkit.';
			} elseif ( stripos( $error_message, 'rate limit' ) !== false || // Detect rate limiting.
					 stripos( $error_message, '429' ) !== false ) {
				$status_code = 429;
				$error_message = 'Rate limit exceeded. Please try again in a moment.';
			} elseif ( stripos( $error_message, '400' ) !== false ) { // Detect API errors.
				$status_code = 400;
			}

			return new \WP_REST_Response(
				array( 'error' => $error_message ),
				$status_code
			);
		}
	}

	/**
	 * Get settings endpoint
	 *
	 * @return \WP_REST_Response Response object.
	 */
	public function get_settings() {
		return new \WP_REST_Response(
			array(
				'provider' => $this->settings->get_provider(),
				'model'    => $this->settings->get_model(),
				'hasApiKey' => ! empty( $this->settings->get_api_key() ),
			),
			200
		);
	}

	/**
	 * Save settings endpoint
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response Response object.
	 */
	public function save_settings( $request ) {
		$provider = $request->get_param( 'provider' );
		$api_key  = $request->get_param( 'apiKey' );
		$model    = $request->get_param( 'model' );

		if ( empty( $provider ) || empty( $model ) ) {
			return new \WP_REST_Response(
				array( 'error' => 'Provider and model are required' ),
				400
			);
		}

		// Save provider.
		update_option(
			Settings::OPTION_PROVIDER,
			$this->settings->sanitize_provider( $provider )
		);

		// Save API key (will be encrypted).
		if ( ! empty( $api_key ) ) {
			update_option(
				Settings::OPTION_API_KEY,
				$this->settings->encrypt_api_key( $api_key )
			);
		}

		// Save model.
		update_option(
			Settings::OPTION_MODEL,
			sanitize_text_field( $model )
		);

		return new \WP_REST_Response(
			array(
				'success' => true,
				'message' => 'Settings saved successfully',
			),
			200
		);
	}
}
