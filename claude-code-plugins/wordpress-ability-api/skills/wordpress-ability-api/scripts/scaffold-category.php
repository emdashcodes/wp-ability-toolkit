#!/usr/bin/env php
<?php
/**
 * WordPress Ability Category Scaffolding Script
 *
 * Generates category registration code from templates based on command-line arguments.
 * Designed to be called by AI agents to quickly scaffold categories.
 *
 * Usage:
 *   php scaffold-category.php --name="category-slug" --label="Category Label" --description="Description" --type="server"
 *
 * Required Arguments:
 *   --name          Category slug (kebab-case, e.g., "data-retrieval")
 *   --label         Human-readable label
 *   --description   Detailed description of what abilities belong in this category
 *   --type          Type: "server" (PHP) or "client" (JavaScript)
 *
 * Output:
 *   Complete category registration code printed to stdout
 *
 * Exit Codes:
 *   0 - Success
 *   1 - Missing required arguments
 *   2 - Invalid argument values
 */

// Parse command-line arguments
$options = getopt('', [
	'name:',
	'label:',
	'description:',
	'type:',
]);

// Validate required arguments
$required = ['name', 'label', 'description', 'type'];
$missing = array_diff($required, array_keys($options));

if (!empty($missing)) {
	fwrite(STDERR, "Error: Missing required arguments: " . implode(', ', $missing) . "\n");
	fwrite(STDERR, "Usage: php scaffold-category.php --name=\"category-slug\" --label=\"Label\" --description=\"Description\" --type=\"server\"\n");
	exit(1);
}

// Extract and validate arguments
$name = $options['name'];
$label = $options['label'];
$description = $options['description'];
$type = strtolower($options['type']);

// Validate category name format (kebab-case)
if (!preg_match('/^[a-z0-9-]+$/', $name)) {
	fwrite(STDERR, "Error: Invalid category name format. Must be kebab-case (lowercase, hyphens allowed, e.g., 'data-retrieval')\n");
	exit(2);
}

// Validate type
if (!in_array($type, ['server', 'client'])) {
	fwrite(STDERR, "Error: Invalid type. Must be 'server' or 'client'\n");
	exit(2);
}

// Load the appropriate template
$template_file = $type === 'server'
	? __DIR__ . '/../assets/category-template.php'
	: __DIR__ . '/../assets/client-category-template.js';

if (!file_exists($template_file)) {
	fwrite(STDERR, "Error: Template file not found: {$template_file}\n");
	exit(2);
}

$template = file_get_contents($template_file);
if ($template === false) {
	fwrite(STDERR, "Error: Unable to read template file: {$template_file}\n");
	exit(2);
}

// Prepare placeholder replacements
$register_function = str_replace('-', '_', $name) . '_category_register';
$namespace = 'text-domain'; // Generic text domain for templates

$placeholders = [
	'{{CATEGORY_NAME}}' => $name,
	'{{LABEL}}' => $label,
	'{{DESCRIPTION}}' => $description,
	'{{REGISTER_FUNCTION}}' => $register_function,
	'{{NAMESPACE}}' => $namespace,
];

// Replace placeholders
$output = str_replace(array_keys($placeholders), array_values($placeholders), $template);

// Output the result
echo $output;

exit(0);
