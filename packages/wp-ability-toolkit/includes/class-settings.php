<?php
/**
 * Settings management for AI Ability Toolkit
 *
 * @package WP_Ability_Toolkit
 */

namespace WP_Ability_Toolkit;

/**
 * Handles plugin settings and encryption
 */
class Settings {
	/**
	 * Option names
	 */
	const OPTION_PROVIDER = 'wp_ability_toolkit_provider';
	const OPTION_API_KEY  = 'wp_ability_toolkit_api_key';
	const OPTION_MODEL    = 'wp_ability_toolkit_model';

	/**
	 * Register settings with WordPress
	 */
	public function register(): void {
		register_setting(
			'wp_ability_toolkit',
			self::OPTION_PROVIDER,
			array(
				'type'              => 'string',
				'sanitize_callback' => array( $this, 'sanitize_provider' ),
				'default'           => 'openai',
			)
		);

		register_setting(
			'wp_ability_toolkit',
			self::OPTION_API_KEY,
			array(
				'type'              => 'string',
				'sanitize_callback' => array( $this, 'encrypt_api_key' ),
			)
		);

		register_setting(
			'wp_ability_toolkit',
			self::OPTION_MODEL,
			array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'default'           => 'gpt-5',
			)
		);
	}

	/**
	 * Sanitize provider selection
	 *
	 * @param string $value Provider value.
	 * @return string Sanitized provider.
	 */
	public function sanitize_provider( string $value ): string {
		// Only OpenAI is currently supported.
		return 'openai';
	}

	/**
	 * Encrypt API key before saving
	 *
	 * @param string $value API key.
	 * @return string Encrypted API key.
	 */
	public function encrypt_api_key( string $value ): string {
		if ( empty( $value ) ) {
			return '';
		}

		// Derive proper encryption key from WordPress salts using SHA-256.
		$key = hash( 'sha256', wp_salt( 'auth' ), true );

		// Prefer Sodium encryption (more secure, authenticated encryption).
		if ( function_exists( 'sodium_crypto_aead_aes256gcm_encrypt' ) && sodium_crypto_aead_aes256gcm_is_available() ) {
			$nonce     = random_bytes( SODIUM_CRYPTO_AEAD_AES256GCM_NPUBBYTES );
			$encrypted = sodium_crypto_aead_aes256gcm_encrypt( $value, '', $nonce, $key );
			return base64_encode( $nonce . $encrypted );
		}

		// Fallback to OpenSSL with AES-256-GCM for authenticated encryption.
		if ( function_exists( 'openssl_encrypt' ) ) {
			$iv  = random_bytes( 16 );
			$tag = '';
			$encrypted = openssl_encrypt( $value, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag );

			if ( false === $encrypted ) {
				return '';
			}

			return base64_encode( $iv . $tag . $encrypted );
		}

		// No encryption available - store obfuscated.
		return base64_encode( $value );
	}

	/**
	 * Decrypt API key
	 *
	 * @param string $encrypted_value Encrypted API key.
	 * @return string Decrypted API key.
	 */
	public function decrypt_api_key( string $encrypted_value ): string {
		if ( empty( $encrypted_value ) ) {
			return '';
		}

		// Derive same encryption key from WordPress salts.
		$key  = hash( 'sha256', wp_salt( 'auth' ), true );
		$data = base64_decode( $encrypted_value );

		if ( false === $data ) {
			return '';
		}

		// Try Sodium decryption first.
		if ( function_exists( 'sodium_crypto_aead_aes256gcm_decrypt' ) && sodium_crypto_aead_aes256gcm_is_available() ) {
			if ( strlen( $data ) > SODIUM_CRYPTO_AEAD_AES256GCM_NPUBBYTES ) {
				$nonce     = substr( $data, 0, SODIUM_CRYPTO_AEAD_AES256GCM_NPUBBYTES );
				$encrypted = substr( $data, SODIUM_CRYPTO_AEAD_AES256GCM_NPUBBYTES );

				try {
					$decrypted = sodium_crypto_aead_aes256gcm_decrypt( $encrypted, '', $nonce, $key );
					if ( false !== $decrypted ) {
						return $decrypted;
					}
					// phpcs:ignore Generic.CodeAnalysis.EmptyStatement.DetectedCatch
				} catch ( \SodiumException $e ) {
					// Fall through to try OpenSSL.
				}
			}
		}

		// Try OpenSSL GCM decryption.
		if ( function_exists( 'openssl_decrypt' ) && strlen( $data ) > 32 ) {
			$iv        = substr( $data, 0, 16 );
			$tag       = substr( $data, 16, 16 );
			$encrypted = substr( $data, 32 );

			$decrypted = openssl_decrypt( $encrypted, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag );
			if ( false !== $decrypted ) {
				return $decrypted;
			}
		}

		// Fallback: simple base64 decoding for development.
		$decoded = base64_decode( $encrypted_value, true );
		if ( false !== $decoded ) {
			return $decoded;
		}

		// Critical security error - unable to decrypt API key.
		error_log( 'WP Ability Toolkit: Failed to decrypt API key - please re-enter your API key in settings.' );
		return '';
	}

	/**
	 * Get current provider
	 *
	 * @return string Provider (currently only 'openai').
	 */
	public function get_provider(): string {
		return get_option( self::OPTION_PROVIDER, 'openai' );
	}

	/**
	 * Get decrypted API key
	 *
	 * @return string Decrypted API key.
	 */
	public function get_api_key(): string {
		$encrypted = get_option( self::OPTION_API_KEY, '' );
		return $this->decrypt_api_key( $encrypted );
	}

	/**
	 * Get current model
	 *
	 * @return string Model name.
	 */
	public function get_model(): string {
		return get_option( self::OPTION_MODEL, 'gpt-5' );
	}
}
