<?php
/**
 * Anthropic API client
 *
 * @package WP_Ability_Toolkit
 */

namespace WP_Ability_Toolkit;

/**
 * Handles communication with Anthropic API
 */
class Anthropic_Client extends AI_Client {
	/**
	 * API URL
	 *
	 * @var string
	 */
	private $api_url = 'https://api.anthropic.com/v1/messages';

	/**
	 * Tool use blocks collected during streaming
	 *
	 * @var array
	 */
	private $tool_use_blocks = array();

	/**
	 * Current content block being processed
	 *
	 * @var array|null
	 */
	private $current_block = null;

	/**
	 * Stream chat completion
	 *
	 * @param string                     $model   Model name.
	 * @param array                      $messages Messages array.
	 * @param Ability_Tools_Manager|null $tools_manager Tools manager instance.
	 * @param int                        $recursion_depth Current recursion depth.
	 * @return void Streams response directly and exits.
	 */
	public function stream_chat( $model, $messages, $tools_manager = null, $recursion_depth = 0 ) {
		// Set streaming headers only on first call (not on recursive calls).
		if ( 0 === $recursion_depth ) {
			$this->set_streaming_headers();
		}

		// Check recursion depth limit.
		if ( $this->check_recursion_limit( $recursion_depth ) ) {
			exit;
		}

		// Convert messages to Anthropic format.
		$anthropic_messages = $this->convert_messages( $messages );

		// Prepare request body.
		$body_array = array(
			'model'      => $model,
			'messages'   => $anthropic_messages,
			'max_tokens' => 4096,
			'stream'     => true,
		);

		// Add tools if available.
		if ( $tools_manager ) {
			$tools = $tools_manager->convert_to_anthropic_tools();
			if ( ! empty( $tools ) ) {
				$body_array['tools'] = $tools;
			}
		}

		$body = wp_json_encode( $body_array );

		// Store tools manager for callback access.
		$this->tools_manager = $tools_manager;

		// Reset tool tracking.
		$this->tool_use_blocks = array();
		$this->current_block = null;

		// Use curl for better streaming support.
		$ch = curl_init( $this->api_url );
		curl_setopt( $ch, CURLOPT_POST, true );
		curl_setopt( $ch, CURLOPT_POSTFIELDS, $body );
		curl_setopt(
			$ch,
			CURLOPT_HTTPHEADER,
			array(
				'x-api-key: ' . $this->api_key,
				'anthropic-version: 2023-06-01',
				'Content-Type: application/json',
			)
		);
		curl_setopt( $ch, CURLOPT_RETURNTRANSFER, false );
		curl_setopt( $ch, CURLOPT_WRITEFUNCTION, array( $this, 'stream_callback' ) );
		curl_setopt( $ch, CURLOPT_TIMEOUT, 60 );

		$result = curl_exec( $ch );

		if ( curl_errno( $ch ) ) {
			$this->send_sse_error( curl_error( $ch ) );
		}

		curl_close( $ch );

		// Handle tool calls if any were collected.
		$this->handle_tool_calls( $model, $messages, $recursion_depth );

		exit;
	}

	/**
	 * Callback for streaming response
	 *
	 * @param resource $ch Curl handle.
	 * @param string   $data Chunk of data.
	 * @return int Length of data.
	 */
	public function stream_callback( $ch, $data ) {
		// Check if this is a JSON error response (not SSE format).
		if ( strpos( $data, '{' ) === 0 ) {
			$error_data = json_decode( $data, true );
			if ( isset( $error_data['error'] ) ) {
				$error_message = is_array( $error_data['error'] ) && isset( $error_data['error']['message'] )
					? $error_data['error']['message']
					: ( is_string( $error_data['error'] ) ? $error_data['error'] : 'Unknown API error' );

				// Provide user-friendly error message.
				$user_message = $error_message;
				if ( strpos( $error_message, 'API key' ) !== false || strpos( $error_message, 'api_key' ) !== false ) {
					$user_message = 'Invalid API key provided. Please check your API key in the WP Ability Toolkit settings page.';
				}

				$this->send_sse_error( $user_message );
				return strlen( $data );
			}
		}

		// Parse SSE lines.
		$lines = explode( "\n", $data );
		$current_event = '';

		foreach ( $lines as $line ) {
			// Track event type.
			if ( strpos( $line, 'event: ' ) === 0 ) {
				$current_event = trim( substr( $line, 7 ) );
				continue;
			}

			if ( strpos( $line, 'data: ' ) === 0 ) {
				$json_data = substr( $line, 6 );
				$chunk = json_decode( $json_data, true );

				if ( ! $chunk ) {
					continue;
				}

				// Handle content_block_start (may be tool_use).
				if ( 'content_block_start' === $current_event && isset( $chunk['content_block'] ) ) {
					$block = $chunk['content_block'];
					if ( isset( $block['type'] ) && 'tool_use' === $block['type'] ) {
						// Start tracking a tool use block.
						$this->current_block = array(
							'id'    => $block['id'] ?? '',
							'name'  => $block['name'] ?? '',
							'input' => '',
						);
					}
				}

				// Handle content_block_delta for tool input.
				if ( 'content_block_delta' === $current_event && isset( $chunk['delta'] ) ) {
					$delta = $chunk['delta'];

					// Tool input delta.
					if ( isset( $delta['type'] ) && 'input_json_delta' === $delta['type'] && $this->current_block ) {
						$this->current_block['input'] .= $delta['partial_json'] ?? '';
					}

					// Text delta (regular response).
					if ( isset( $delta['text'] ) && ! $this->current_block ) {
						$simple_chunk = array(
							'delta' => $delta['text'],
						);
						echo 'data: ' . wp_json_encode( $simple_chunk ) . "\n\n";
						flush();
					}
				}

				// Handle content_block_stop.
				if ( 'content_block_stop' === $current_event && $this->current_block ) {
					// Finalize the tool use block.
					$this->tool_use_blocks[] = $this->current_block;
					$this->current_block = null;
				}

				// Handle message_stop event - but don't send done yet if we have tools.
				if ( 'message_stop' === $current_event ) {
					// Don't send done - let handle_tool_calls decide what to do.
					return strlen( $data );
				}
			}
		}

		return strlen( $data );
	}

	/**
	 * Handle tool calls after streaming completes
	 *
	 * @param string $model    Model name.
	 * @param array  $messages Original messages.
	 * @param int    $recursion_depth Current recursion depth.
	 */
	private function handle_tool_calls( $model, $messages, $recursion_depth = 0 ) {
		// If no tool calls, we're done.
		if ( empty( $this->tool_use_blocks ) ) {
			echo 'data: ' . wp_json_encode( array( 'done' => true ) ) . "\n\n";
			flush();
			return;
		}

		// Check if any tools are client-side.
		$has_client_tools = false;
		foreach ( $this->tool_use_blocks as $tool_call ) {
			if ( $this->tools_manager && $this->tools_manager->is_client_tool( $tool_call['name'] ) ) {
				$has_client_tools = true;
				break;
			}
		}

		// If we have client tools, send assistant message + client tool calls.
		if ( $has_client_tools ) {
			// Build assistant message with tool_calls (OpenAI format).
			$tool_calls = array();
			foreach ( $this->tool_use_blocks as $tool_call ) {
				$parsed_input = json_decode( $tool_call['input'], true );
				$ability_name = $this->tools_manager->unsanitize_tool_name( $tool_call['name'] );
				$tool_calls[] = array(
					'id'       => $tool_call['id'],
					'type'     => 'function',
					'function' => array(
						'name'      => $ability_name,
						'arguments' => wp_json_encode( $parsed_input ?? array() ),
					),
				);
			}

			// Send the assistant message with tool_calls.
			echo 'data: ' . wp_json_encode(
				array(
					'assistant_message' => array(
						'role'       => 'assistant',
						'content'    => '',
						'tool_calls' => $tool_calls,
					),
				)
			) . "\n\n";
			flush();

			// Now send each client tool call for execution.
			foreach ( $this->tool_use_blocks as $tool_call ) {
				if ( $this->tools_manager->is_client_tool( $tool_call['name'] ) ) {
					$parsed_input = json_decode( $tool_call['input'], true );
					$ability_name = $this->tools_manager->unsanitize_tool_name( $tool_call['name'] );
					echo 'data: ' . wp_json_encode(
						array(
							'client_tool_call' => array(
								'id'    => $tool_call['id'],
								'name'  => $ability_name,
								'input' => $parsed_input ?? array(),
							),
						)
					) . "\n\n";
					flush();
				}
			}

			return;
		}

		// All tools are server-side, execute them.
		$tool_results = array();
		foreach ( $this->tool_use_blocks as $tool_call ) {
			$parsed_input = json_decode( $tool_call['input'], true );
			if ( ! $parsed_input ) {
				$parsed_input = array();
			}

			// Send event that we're about to execute a server-side tool.
			$ability_name = $this->tools_manager->unsanitize_tool_name( $tool_call['name'] );
			echo 'data: ' . wp_json_encode(
				array(
					'server_tool_call' => array(
						'id'     => $tool_call['id'],
						'name'   => $ability_name,
						'input'  => $parsed_input,
						'status' => 'pending',
					),
				)
			) . "\n\n";
			flush();

			// Execute the tool.
			$result = $this->tools_manager->execute_server_tool( $tool_call['name'], $parsed_input );

			// Send event that tool execution completed.
			$is_error = is_wp_error( $result );
			echo 'data: ' . wp_json_encode(
				array(
					'server_tool_call' => array(
						'id'     => $tool_call['id'],
						'name'   => $ability_name,
						'input'  => $parsed_input,
						'status' => $is_error ? 'error' : 'success',
						'output' => $is_error ? null : $result,
						'error'  => $is_error ? $result->get_error_message() : null,
					),
				)
			) . "\n\n";
			flush();

			$tool_results[] = array(
				'type'        => 'tool_result',
				'tool_use_id' => $tool_call['id'],
				'content'     => $this->tools_manager->format_tool_result( $result ),
			);
		}

		// Add tool results to conversation as a new user message.
		$messages[] = array(
			'role'    => 'user',
			'content' => $tool_results,
		);

		// Make recursive call to continue conversation with incremented depth.
		$this->stream_chat( $model, $messages, $this->tools_manager, $recursion_depth + 1 );
	}

	/**
	 * Convert OpenAI format messages to Anthropic format
	 *
	 * @param array $messages Messages in OpenAI format.
	 * @return array Messages in Anthropic format.
	 */
	private function convert_messages( $messages ) {
		$converted = array();

		foreach ( $messages as $message ) {
			// If content is already an array (tool results), pass as-is.
			if ( is_array( $message['content'] ) ) {
				$converted[] = array(
					'role'    => 'assistant' === $message['role'] ? 'assistant' : 'user',
					'content' => $message['content'],
				);
			} else {
				// Regular text message.
				$converted[] = array(
					'role'    => 'assistant' === $message['role'] ? 'assistant' : 'user',
					'content' => $message['content'],
				);
			}
		}

		return $converted;
	}
}
