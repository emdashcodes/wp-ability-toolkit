<?php
/**
 * Abstract base class for AI API clients
 *
 * @package WP_Ability_Toolkit
 */

namespace WP_Ability_Toolkit;

/**
 * Base class for AI API clients (OpenAI, Anthropic, etc.)
 */
abstract class AI_Client {
	/**
	 * Maximum tool call recursion depth
	 */
	const MAX_RECURSION_DEPTH = 20;

	/**
	 * API key
	 *
	 * @var string
	 */
	protected $api_key;

	/**
	 * Tools manager instance
	 *
	 * @var Ability_Tools_Manager|null
	 */
	protected $tools_manager = null;

	/**
	 * Constructor
	 *
	 * @param string $api_key API key.
	 */
	public function __construct( $api_key ) {
		$this->api_key = $api_key;
	}

	/**
	 * Stream chat completion
	 *
	 * @param string                     $model   Model name.
	 * @param array                      $messages Messages array.
	 * @param Ability_Tools_Manager|null $tools_manager Tools manager instance.
	 * @param int                        $recursion_depth Current recursion depth.
	 * @return void Streams response directly and exits.
	 */
	abstract public function stream_chat( $model, $messages, $tools_manager = null, $recursion_depth = 0 );

	/**
	 * Send SSE error message
	 *
	 * @param string $message Error message.
	 */
	protected function send_sse_error( $message ) {
		echo 'data: ' . wp_json_encode( array( 'error' => $message ) ) . "\n\n";
		flush();
	}

	/**
	 * Check and handle recursion depth limit
	 *
	 * @param int $recursion_depth Current recursion depth.
	 * @return bool True if limit exceeded, false otherwise.
	 */
	protected function check_recursion_limit( $recursion_depth ) {
		if ( $recursion_depth >= self::MAX_RECURSION_DEPTH ) {
			$this->send_sse_error( 'Maximum tool execution depth reached (' . self::MAX_RECURSION_DEPTH . ' rounds). This may indicate a complex workflow or a tool execution loop.' );
			echo 'data: ' . wp_json_encode( array( 'done' => true ) ) . "\n\n";
			flush();
			return true;
		}
		return false;
	}

	/**
	 * Set streaming headers
	 */
	protected function set_streaming_headers() {
		header( 'Content-Type: text/event-stream' );
		header( 'Cache-Control: no-cache' );
		header( 'X-Accel-Buffering: no' );

		// Disable output buffering.
		if ( ob_get_level() ) {
			ob_end_clean();
		}
	}
}
