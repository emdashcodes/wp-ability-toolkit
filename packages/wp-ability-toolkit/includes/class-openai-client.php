<?php
/**
 * OpenAI API client
 *
 * @package WP_Ability_Toolkit
 */

namespace WP_Ability_Toolkit;

/**
 * Handles communication with OpenAI API
 */
class OpenAI_Client extends AI_Client {
	/**
	 * API URL
	 *
	 * @var string
	 */
	private $api_url = 'https://api.openai.com/v1/chat/completions';

	/**
	 * Tool calls collected during streaming
	 *
	 * @var array
	 */
	private $tool_calls = array();

	/**
	 * Current tool call being accumulated
	 *
	 * @var array|null
	 */
	private $current_tool_call = null;

	/**
	 * Buffer for incomplete streaming lines
	 *
	 * @var string
	 */
	private $stream_buffer = '';

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

		// Store tools manager for callback access.
		$this->tools_manager = $tools_manager;

		// Reset tool tracking.
		$this->tool_calls = array();
		$this->current_tool_call = null;
		$this->stream_buffer = '';

		// Prepare request body.
		$body_array = array(
			'model'    => $model,
			'messages' => $messages,
			'stream'   => true,
		);

		// Add tools if available.
		if ( $tools_manager ) {
			$tools = $tools_manager->convert_to_openai_tools();
			if ( ! empty( $tools ) ) {
				$body_array['tools'] = $tools;
				$body_array['tool_choice'] = 'auto';
			}
		}

		$body = wp_json_encode( $body_array );

		// Use curl for better streaming support.
		$ch = curl_init( $this->api_url );
		curl_setopt( $ch, CURLOPT_POST, true );
		curl_setopt( $ch, CURLOPT_POSTFIELDS, $body );
		curl_setopt(
			$ch,
			CURLOPT_HTTPHEADER,
			array(
				'Authorization: Bearer ' . $this->api_key,
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
		// Save original length for curl return value.
		$original_length = strlen( $data );

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
				return $original_length;
			}
		}

		// Prepend any buffered incomplete line from previous chunk.
		$data = $this->stream_buffer . $data;

		// Split into lines.
		$lines = explode( "\n", $data );

		// Check if the chunk ended with a newline.
		// If not, the last element is an incomplete line.
		$ends_with_newline = substr( $data, -1 ) === "\n";

		// If chunk doesn't end with newline, buffer the incomplete line.
		if ( ! $ends_with_newline ) {
			$this->stream_buffer = array_pop( $lines );
		} else {
			$this->stream_buffer = '';
		}

		// Process complete lines only.
		foreach ( $lines as $line ) {
			// Skip empty lines.
			if ( trim( $line ) === '' ) {
				continue;
			}

			// Only process SSE data lines.
			if ( strpos( $line, 'data: ' ) !== 0 ) {
				continue;
			}

			$json_data = substr( $line, 6 );

			// Check for [DONE] marker.
			if ( trim( $json_data ) === '[DONE]' ) {
				// Don't send done yet if we have tool calls.
				if ( empty( $this->tool_calls ) ) {
					echo 'data: ' . wp_json_encode( array( 'done' => true ) ) . "\n\n";
					flush();
				}
				continue;
			}

			// Parse OpenAI chunk.
			$chunk = json_decode( $json_data, true );
			if ( $chunk && isset( $chunk['choices'][0] ) ) {
				$choice = $chunk['choices'][0];
				$delta = $choice['delta'] ?? array();

				// Handle tool calls.
				if ( isset( $delta['tool_calls'] ) ) {
					foreach ( $delta['tool_calls'] as $tool_call_delta ) {
						$index = $tool_call_delta['index'] ?? 0;

						// Initialize tool call if needed.
						if ( ! isset( $this->tool_calls[ $index ] ) ) {
							$this->tool_calls[ $index ] = array(
								'id'   => $tool_call_delta['id'] ?? '',
								'type' => $tool_call_delta['type'] ?? 'function',
								'function' => array(
									'name'      => '',
									'arguments' => '',
								),
							);
						}

						// Accumulate function name.
						if ( isset( $tool_call_delta['function']['name'] ) ) {
							$this->tool_calls[ $index ]['function']['name'] .= $tool_call_delta['function']['name'];
						}

						// Accumulate function arguments.
						if ( isset( $tool_call_delta['function']['arguments'] ) ) {
							$this->tool_calls[ $index ]['function']['arguments'] .= $tool_call_delta['function']['arguments'];
						}
					}
				}

				// Handle regular text content (only if not in tool call mode).
				if ( isset( $delta['content'] ) && empty( $this->tool_calls ) ) {
					$simple_chunk = array();
					$simple_chunk['delta'] = $delta['content'];
					if ( isset( $delta['role'] ) ) {
						$simple_chunk['role'] = $delta['role'];
					}
					if ( isset( $chunk['id'] ) ) {
						$simple_chunk['id'] = $chunk['id'];
					}

					echo 'data: ' . wp_json_encode( $simple_chunk ) . "\n\n";
					flush();
				}

				// Check finish reason.
				if ( isset( $choice['finish_reason'] ) && $choice['finish_reason'] ) {
					// Don't send done - let handle_tool_calls decide.
					return $original_length;
				}
			}
		}

		return $original_length;
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
		if ( empty( $this->tool_calls ) ) {
			echo 'data: ' . wp_json_encode( array( 'done' => true ) ) . "\n\n";
			flush();
			return;
		}

		// Check if any tools are client-side.
		$has_client_tools = false;
		$client_tool_calls = array();

		foreach ( $this->tool_calls as $tool_call ) {
			$function_name = $tool_call['function']['name'];
			$is_client = $this->tools_manager && $this->tools_manager->is_client_tool( $function_name );
			if ( $is_client ) {
				$has_client_tools = true;
				$client_tool_calls[] = $tool_call;
			}
		}

		// If we have client tools, emit assistant message and tool call events.
		if ( $has_client_tools ) {
			// First emit the assistant message with tool_calls.
			echo 'data: ' . wp_json_encode(
				array(
					'assistant_message' => array(
						'role'       => 'assistant',
						'content'    => '',
						'tool_calls' => $this->tool_calls,
					),
				)
			) . "\n\n";
			flush();

			// Then emit individual client tool call events.
			foreach ( $client_tool_calls as $tool_call ) {
				$parsed_args = json_decode( $tool_call['function']['arguments'], true );
				$ability_name = $this->tools_manager->unsanitize_tool_name( $tool_call['function']['name'] );
				echo 'data: ' . wp_json_encode(
					array(
						'client_tool_call' => array(
							'id'    => $tool_call['id'],
							'name'  => $ability_name,
							'input' => $parsed_args ?? array(),
						),
					)
				) . "\n\n";
				flush();
			}

			return;
		}

		// All tools are server-side, execute them.
		// First, add the assistant message with tool calls to the conversation.
		$messages[] = array(
			'role'       => 'assistant',
			'content'    => null,
			'tool_calls' => $this->tool_calls,
		);

		// Execute each tool and add results.
		foreach ( $this->tool_calls as $tool_call ) {
			$function_name = $tool_call['function']['name'];
			$parsed_args = json_decode( $tool_call['function']['arguments'], true );
			if ( ! $parsed_args ) {
				$parsed_args = array();
			}

			// Send event that we're about to execute a server-side tool.
			$ability_name = $this->tools_manager->unsanitize_tool_name( $function_name );
			echo 'data: ' . wp_json_encode(
				array(
					'server_tool_call' => array(
						'id'     => $tool_call['id'],
						'name'   => $ability_name,
						'input'  => $parsed_args,
						'status' => 'pending',
					),
				)
			) . "\n\n";
			flush();

			// Execute the tool.
			$result = $this->tools_manager->execute_server_tool( $function_name, $parsed_args );

			// Send event that tool execution completed.
			$is_error = is_wp_error( $result );
			echo 'data: ' . wp_json_encode(
				array(
					'server_tool_call' => array(
						'id'     => $tool_call['id'],
						'name'   => $ability_name,
						'input'  => $parsed_args,
						'status' => $is_error ? 'error' : 'success',
						'output' => $is_error ? null : $result,
						'error'  => $is_error ? $result->get_error_message() : null,
					),
				)
			) . "\n\n";
			flush();

			// Add tool result message.
			$messages[] = array(
				'role'         => 'tool',
				'tool_call_id' => $tool_call['id'],
				'content'      => $this->tools_manager->format_tool_result( $result ),
			);
		}

		// Make recursive call to continue conversation with incremented depth.
		$this->stream_chat( $model, $messages, $this->tools_manager, $recursion_depth + 1 );
	}
}
