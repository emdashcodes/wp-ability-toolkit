#!/usr/bin/env php
<?php
/**
 * WordPress Ability Category Validation Script (PHP)
 *
 * Validates PHP category registration code using PHP's built-in tokenizer.
 * For JavaScript validation, use validate-category.js instead.
 *
 * Usage:
 *   php validate-category.php path/to/category-file.php
 *
 * Arguments:
 *   file_path    Path to the PHP file containing category registration code
 *
 * Exit Codes:
 *   0 - Validation passed
 *   1 - Validation failed
 *   2 - File not found or invalid usage
 */

// Check for file argument
if ($argc < 2) {
	fwrite(STDERR, "Usage: php validate-category.php path/to/category-file.php\n");
	exit(2);
}

$file_path = $argv[1];

// Check if file exists
if (!file_exists($file_path)) {
	fwrite(STDERR, "Error: File not found: {$file_path}\n");
	exit(2);
}

// Check if file is PHP
$file_extension = pathinfo($file_path, PATHINFO_EXTENSION);
if ($file_extension !== 'php') {
	fwrite(STDERR, "Error: This validator only supports PHP files. For JavaScript validation, use validate-category.js\n");
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

// Parse and validate PHP categories
$categories = parse_php_categories($content);

if (empty($categories)) {
	$errors[] = "No wp_register_ability_category() calls found in file";
} else {
	foreach ($categories as $category) {
		echo "Validating category: {$category['name']}\n";
		validate_category($category, $errors, $warnings);
		echo "\n";
	}
}

// Output final results
output_results($file_path, $errors, $warnings);

// Exit with appropriate code
exit(empty($errors) ? 0 : 1);

/**
 * Parse PHP file to extract category registrations using token_get_all().
 *
 * @param string $content PHP file content
 * @return array Array of category data
 */
function parse_php_categories($content) {
	$tokens = token_get_all($content);
	$categories = [];
	$i = 0;
	$count = count($tokens);

	while ($i < $count) {
		$token = $tokens[$i];

		// Look for function call: wp_register_ability_category
		if (is_array($token) && $token[0] === T_STRING && $token[1] === 'wp_register_ability_category') {
			// Found the function call, now extract arguments
			$category = extract_category_from_tokens($tokens, $i);
			if ($category) {
				$categories[] = $category;
			}
		}

		$i++;
	}

	return $categories;
}

/**
 * Extract category data from tokens starting at function call position.
 *
 * @param array $tokens All tokens
 * @param int $start_pos Position of function name token
 * @return array|null Category data or null if parsing fails
 */
function extract_category_from_tokens($tokens, $start_pos) {
	$i = $start_pos + 1;
	$count = count($tokens);
	$category = ['name' => null, 'label' => null, 'description' => null];

	// Skip whitespace to opening parenthesis
	while ($i < $count && is_array($tokens[$i]) && $tokens[$i][0] === T_WHITESPACE) {
		$i++;
	}

	// Should be at opening parenthesis
	if ($i >= $count || $tokens[$i] !== '(') {
		return null;
	}
	$i++;

	// Skip whitespace to category name
	while ($i < $count && is_array($tokens[$i]) && $tokens[$i][0] === T_WHITESPACE) {
		$i++;
	}

	// Extract category name (first argument - string)
	if ($i < $count && is_array($tokens[$i]) && ($tokens[$i][0] === T_CONSTANT_ENCAPSED_STRING)) {
		$category['name'] = trim($tokens[$i][1], '\'"');
		$i++;
	} else {
		return null; // No category name found
	}

	// Now look for the array with label and description
	// Skip to 'array' keyword or '['
	while ($i < $count) {
		$token = $tokens[$i];

		if (is_array($token) && $token[0] === T_ARRAY) {
			// Found 'array(' syntax
			$i++;
			// Skip to opening parenthesis
			while ($i < $count && $tokens[$i] !== '(') {
				$i++;
			}
			if ($i < $count) {
				$i++; // Move past '('
				$extracted = extract_array_contents($tokens, $i);
				$category = array_merge($category, $extracted);
			}
			break;
		} elseif ($token === '[') {
			// Found '[' short array syntax
			$i++;
			$extracted = extract_array_contents($tokens, $i);
			$category = array_merge($category, $extracted);
			break;
		}

		$i++;
	}

	return $category;
}

/**
 * Extract label and description from array tokens.
 *
 * @param array $tokens All tokens
 * @param int $start_pos Position after array opening
 * @return array Array with label and description keys
 */
function extract_array_contents($tokens, $start_pos) {
	$result = ['label' => null, 'description' => null];
	$i = $start_pos;
	$count = count($tokens);
	$depth = 1; // Track nested arrays/parentheses

	while ($i < $count && $depth > 0) {
		$token = $tokens[$i];

		// Track depth for nested structures
		if ($token === '(' || $token === '[') {
			$depth++;
		} elseif ($token === ')' || $token === ']') {
			$depth--;
			if ($depth === 0) break;
		}

		// Look for 'label' or 'description' keys
		if (is_array($token) && $token[0] === T_CONSTANT_ENCAPSED_STRING) {
			$key = trim($token[1], '\'"');

			if ($key === 'label' || $key === 'description') {
				// Skip to the value (past '=>' and whitespace)
				$i++;
				// Skip whitespace
				while ($i < $count && is_array($tokens[$i]) && $tokens[$i][0] === T_WHITESPACE) {
					$i++;
				}
				// Skip '=>' (T_DOUBLE_ARROW)
				if ($i < $count && is_array($tokens[$i]) && $tokens[$i][0] === T_DOUBLE_ARROW) {
					$i++;
				}
				// Skip more whitespace
				while ($i < $count && is_array($tokens[$i]) && $tokens[$i][0] === T_WHITESPACE) {
					$i++;
				}

				// Check for __() translation function
				if ($i < $count && is_array($tokens[$i]) && $tokens[$i][0] === T_STRING && $tokens[$i][1] === '__') {
					// Skip to opening parenthesis of __()
					while ($i < $count && $tokens[$i] !== '(') {
						$i++;
					}
					if ($i < $count) {
						$depth++; // Track the opening paren
						$i++; // Move past '('
					}

					// Skip whitespace
					while ($i < $count && is_array($tokens[$i]) && $tokens[$i][0] === T_WHITESPACE) {
						$i++;
					}

					// Extract string value
					if ($i < $count && is_array($tokens[$i]) && $tokens[$i][0] === T_CONSTANT_ENCAPSED_STRING) {
						$result[$key] = trim($tokens[$i][1], '\'"');
					}
				} elseif ($i < $count && is_array($tokens[$i]) && $tokens[$i][0] === T_CONSTANT_ENCAPSED_STRING) {
					// Direct string value
					$result[$key] = trim($tokens[$i][1], '\'"');
				}
				// Continue to next iteration without incrementing again
				continue;
			}
		}

		$i++;
	}

	return $result;
}

/**
 * Validate category data.
 *
 * @param array $category Category data
 * @param array &$errors Error messages array
 * @param array &$warnings Warning messages array
 */
function validate_category($category, &$errors, &$warnings) {
	$name = $category['name'];

	// Validate category name format (kebab-case)
	if (!preg_match('/^[a-z0-9-]+$/', $name)) {
		$errors[] = "Invalid category name format: '{$name}'. Must be kebab-case (lowercase, hyphens allowed)";
	}

	// Check required fields
	if (empty($category['label'])) {
		$errors[] = "Missing required field 'label' in category '{$name}'";
	} else {
		// Validate label quality
		if (strlen(trim($category['label'])) < 2) {
			$warnings[] = "Label for category '{$name}' is too short. Provide a meaningful label.";
		}
	}

	if (empty($category['description'])) {
		$errors[] = "Missing required field 'description' in category '{$name}'";
	} else {
		// Validate description quality
		$desc_length = strlen(trim($category['description']));

		if ($desc_length < 15) {
			$warnings[] = "Description for category '{$name}' is too short ({$desc_length} chars). Provide detailed information about what abilities belong in this category.";
		}

		if (stripos($category['description'], 'TODO') !== false) {
			$warnings[] = "Description for category '{$name}' contains TODO placeholder. Replace with actual description.";
		}
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
