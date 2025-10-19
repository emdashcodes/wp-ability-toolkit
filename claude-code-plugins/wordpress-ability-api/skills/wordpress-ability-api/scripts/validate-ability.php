#!/usr/bin/env php
<?php
/**
 * WordPress Ability Validation Script
 *
 * Validates ability registration code independently of WordPress.
 * Checks structure, required fields, and JSON Schema validity.
 *
 * Usage:
 *   php validate-ability.php path/to/ability-file.php
 *
 * Arguments:
 *   file_path    Path to the PHP file containing ability registration code
 *
 * Exit Codes:
 *   0 - Validation passed
 *   1 - Validation failed
 *   2 - File not found or invalid usage
 */

// Check for file argument
if ($argc < 2) {
	fwrite(STDERR, "Usage: php validate-ability.php path/to/ability-file.php\n");
	exit(2);
}

$file_path = $argv[1];

// Check if file exists
if (!file_exists($file_path)) {
	fwrite(STDERR, "Error: File not found: {$file_path}\n");
	exit(2);
}

// Read file contents
$content = file_get_contents($file_path);
if ($content === false) {
	fwrite(STDERR, "Error: Unable to read file: {$file_path}\n");
	exit(2);
}

// Initialize validation results
$errors = [];
$warnings = [];

// Extract wp_register_ability calls
$pattern = '/wp_register_ability\s*\(\s*[\'"]([^\'"]+)[\'"]\s*,\s*array\s*\((.*?)\)\s*\)\s*;/s';
preg_match_all($pattern, $content, $matches, PREG_SET_ORDER);

if (empty($matches)) {
	$errors[] = "No wp_register_ability() calls found in file";
	output_results($file_path, $errors, $warnings);
	exit(1);
}

// Validate each ability registration
foreach ($matches as $index => $match) {
	$ability_name = $match[1];
	$args_string = $match[2];

	echo "Validating ability: {$ability_name}\n";

	// Validate ability name format
	if (!preg_match('/^[a-z0-9-]+\/[a-z0-9-]+$/', $ability_name)) {
		$errors[] = "Invalid ability name format: '{$ability_name}'. Must be 'namespace/ability-name' (lowercase, hyphens allowed)";
	}

	// Parse the arguments array
	$args = parse_ability_args($args_string);

	// Validate required fields
	validate_required_fields($ability_name, $args, $errors, $warnings);

	// Validate schemas
	if (isset($args['input_schema'])) {
		validate_json_schema($ability_name, 'input_schema', $args['input_schema'], $errors);
	}
	if (isset($args['output_schema'])) {
		validate_json_schema($ability_name, 'output_schema', $args['output_schema'], $errors);
	}

	// Best practice checks
	check_best_practices($ability_name, $args, $warnings);

	echo "\n";
}

// Output final results
output_results($file_path, $errors, $warnings);

// Exit with appropriate code
exit(empty($errors) ? 0 : 1);

/**
 * Parse ability registration arguments from string.
 *
 * This is a simplified parser that extracts key configuration values.
 *
 * @param string $args_string The arguments array as a string
 * @return array Parsed arguments
 */
function parse_ability_args($args_string) {
	$args = [];

	// Extract simple string/boolean values
	$simple_patterns = [
		'label' => '/[\'"]label[\'"]\s*=>\s*(?:__\s*\(\s*)?[\'"]([^\'"]+)[\'"]/',
		'description' => '/[\'"]description[\'"]\s*=>\s*(?:__\s*\(\s*)?[\'"]([^\'"]+)[\'"]/',
		'category' => '/[\'"]category[\'"]\s*=>\s*[\'"]([^\'"]+)[\'"]/',
		'execute_callback' => '/[\'"]execute_callback[\'"]\s*=>\s*[\'"]([^\'"]+)[\'"]/',
	];

	foreach ($simple_patterns as $key => $pattern) {
		if (preg_match($pattern, $args_string, $matches)) {
			$args[$key] = $matches[1];
		}
	}

	// Check for permission_callback (function or string)
	if (preg_match('/[\'"]permission_callback[\'"]\s*=>\s*(.+?),?\s*(?=[\'"][a-z_]+[\'"]|$)/s', $args_string, $matches)) {
		$args['permission_callback'] = trim($matches[1]);
	}

	// Extract schema arrays (look for 'input_schema' and 'output_schema')
	if (preg_match('/[\'"]input_schema[\'"]\s*=>\s*array\s*\((.*?)\),?\s*(?=[\'"][a-z_]+[\'"]|$)/s', $args_string, $matches)) {
		$args['input_schema'] = $matches[1];
	}
	if (preg_match('/[\'"]output_schema[\'"]\s*=>\s*array\s*\((.*?)\),?\s*(?=[\'"][a-z_]+[\'"]|$)/s', $args_string, $matches)) {
		$args['output_schema'] = $matches[1];
	}

	// Extract meta array
	if (preg_match('/[\'"]meta[\'"]\s*=>\s*array\s*\((.*?)\),?\s*(?:\)|$)/s', $args_string, $matches)) {
		$args['meta'] = $matches[1];
	}

	return $args;
}

/**
 * Validate required fields are present.
 *
 * @param string $ability_name Ability name
 * @param array $args Parsed arguments
 * @param array &$errors Error messages array
 * @param array &$warnings Warning messages array
 */
function validate_required_fields($ability_name, $args, &$errors, &$warnings) {
	$required_fields = ['label', 'description', 'category', 'execute_callback'];

	foreach ($required_fields as $field) {
		if (!isset($args[$field])) {
			$errors[] = "Missing required field '{$field}' in ability '{$ability_name}'";
		}
	}

	// Check for empty descriptions (common mistake)
	if (isset($args['description']) && strlen(trim($args['description'])) < 10) {
		$warnings[] = "Description for '{$ability_name}' is too short. Provide detailed information for AI agents.";
	}

	// Check for placeholder/TODO descriptions
	if (isset($args['description']) && stripos($args['description'], 'TODO') !== false) {
		$warnings[] = "Description for '{$ability_name}' contains TODO placeholder. Replace with actual description.";
	}

	// Warn about missing schemas (recommended if ability takes input or provides output)
	if (!isset($args['input_schema'])) {
		$warnings[] = "Missing 'input_schema' in ability '{$ability_name}'. Input schema should be provided if this ability accepts parameters.";
	}

	if (!isset($args['output_schema'])) {
		$warnings[] = "Missing 'output_schema' in ability '{$ability_name}'. Output schema should be provided if this ability returns data.";
	}

	// Warn about missing permission callback
	if (!isset($args['permission_callback'])) {
		$warnings[] = "Missing 'permission_callback' in ability '{$ability_name}'. Consider adding permission checks to control who can execute this ability.";
	}
}

/**
 * Validate a JSON Schema structure.
 *
 * @param string $ability_name Ability name
 * @param string $schema_type Schema type ('input_schema' or 'output_schema')
 * @param string $schema_string Schema as string
 * @param array &$errors Error messages array
 */
function validate_json_schema($ability_name, $schema_type, $schema_string, &$errors) {
	// Check for 'type' field (required in JSON Schema)
	if (strpos($schema_string, "'type'") === false && strpos($schema_string, '"type"') === false) {
		$errors[] = "{$schema_type} for '{$ability_name}' missing 'type' field (required by JSON Schema)";
	}

	// Check for 'properties' if type is 'object'
	if (preg_match('/[\'"]type[\'"]\s*=>\s*[\'"]object[\'"]/', $schema_string)) {
		if (strpos($schema_string, "'properties'") === false && strpos($schema_string, '"properties"') === false) {
			$errors[] = "{$schema_type} for '{$ability_name}' has type 'object' but missing 'properties' field";
		}
	}

	// Check for 'items' if type is 'array'
	if (preg_match('/[\'"]type[\'"]\s*=>\s*[\'"]array[\'"]/', $schema_string)) {
		if (strpos($schema_string, "'items'") === false && strpos($schema_string, '"items"') === false) {
			$warnings[] = "{$schema_type} for '{$ability_name}' has type 'array' but missing 'items' field (recommended)";
		}
	}

	// Validate that properties have types
	if (preg_match_all('/[\'"]properties[\'"]\s*=>\s*array\s*\((.*?)\)/s', $schema_string, $prop_matches)) {
		foreach ($prop_matches[1] as $properties) {
			// Extract each property definition
			if (preg_match_all('/[\'"]([a-z_]+)[\'"]\s*=>\s*array\s*\((.*?)\)/s', $properties, $prop_defs, PREG_SET_ORDER)) {
				foreach ($prop_defs as $prop_def) {
					$prop_name = $prop_def[1];
					$prop_content = $prop_def[2];

					// Each property should have a 'type'
					if (strpos($prop_content, "'type'") === false && strpos($prop_content, '"type"') === false) {
						$errors[] = "{$schema_type} property '{$prop_name}' in '{$ability_name}' missing 'type' field";
					}
				}
			}
		}
	}
}

/**
 * Check for best practices.
 *
 * @param string $ability_name Ability name
 * @param array $args Parsed arguments
 * @param array &$warnings Warning messages array
 */
function check_best_practices($ability_name, $args, &$warnings) {
	// Check for __return_true permission callback (context-aware security check)
	if (isset($args['permission_callback']) && strpos($args['permission_callback'], '__return_true') !== false) {
		// Extract annotations to determine if this is a safe public ability
		$is_readonly = false;
		$is_destructive = true;

		if (isset($args['meta']) && strpos($args['meta'], 'annotations') !== false) {
			$is_readonly = preg_match('/[\'"]readonly[\'"]\s*=>\s*true/', $args['meta']);
			$is_destructive = !preg_match('/[\'"]destructive[\'"]\s*=>\s*false/', $args['meta']);
		}

		// Only warn if this is potentially dangerous (not readonly OR is destructive)
		if (!$is_readonly || $is_destructive) {
			$warnings[] = "Ability '{$ability_name}' uses __return_true() for permissions with write/destructive operations. Ensure public access is intentional.";
		}
		// If it's readonly and non-destructive, __return_true is fine - no warning needed
	}

	// Check for annotations in meta
	if (isset($args['meta'])) {
		$has_annotations = strpos($args['meta'], 'annotations') !== false;
		if (!$has_annotations) {
			$warnings[] = "Ability '{$ability_name}' missing annotations (readonly, destructive, idempotent). These help AI agents understand the ability's behavior.";
		}
	} else {
		$warnings[] = "Ability '{$ability_name}' missing 'meta' array. Consider adding annotations for better discoverability.";
	}

	// Check category naming (should be kebab-case)
	if (isset($args['category']) && !preg_match('/^[a-z0-9-]+$/', $args['category'])) {
		$warnings[] = "Category '{$args['category']}' should use kebab-case naming (lowercase with hyphens)";
	}
}

/**
 * Output validation results.
 *
 * @param string $file_path File being validated
 * @param array $errors Error messages
 * @param array $warnings Warning messages
 */
function output_results($file_path, $errors, $warnings) {
	echo str_repeat('=', 70) . "\n";
	echo "Validation Results: {$file_path}\n";
	echo str_repeat('=', 70) . "\n\n";

	if (!empty($errors)) {
		echo "ERRORS (" . count($errors) . "):\n";
		foreach ($errors as $error) {
			echo "  ✗ {$error}\n";
		}
		echo "\n";
	}

	if (!empty($warnings)) {
		echo "WARNINGS (" . count($warnings) . "):\n";
		foreach ($warnings as $warning) {
			echo "  ⚠ {$warning}\n";
		}
		echo "\n";
	}

	if (empty($errors) && empty($warnings)) {
		echo "✓ All validations passed! No issues found.\n\n";
	} elseif (empty($errors)) {
		echo "✓ Validation passed with warnings.\n\n";
	} else {
		echo "✗ Validation failed. Please fix the errors above.\n\n";
	}
}
