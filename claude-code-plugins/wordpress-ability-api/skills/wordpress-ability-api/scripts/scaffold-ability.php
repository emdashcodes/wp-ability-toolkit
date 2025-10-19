#!/usr/bin/env php
<?php
/**
 * WordPress Ability Scaffolding Script
 *
 * Generates ability registration code from templates based on command-line arguments.
 * Designed to be called by AI agents to quickly scaffold abilities.
 *
 * Usage:
 *   php scaffold-ability.php --name="plugin/ability" --type="server" --category="data-retrieval"
 *
 * Required Arguments:
 *   --name          Ability name in format "namespace/ability-name"
 *   --type          Type of ability: "server" or "client"
 *   --category      Category slug (e.g., "data-retrieval", "data-modification")
 *
 * Optional Arguments:
 *   --label         Human-readable label (default: generated from name)
 *   --description   Detailed description (default: placeholder)
 *   --readonly      Whether ability only reads data: "true" or "false" (default: false)
 *   --destructive   Whether ability can delete data: "true" or "false" (default: true)
 *   --idempotent    Whether repeated calls are safe: "true" or "false" (default: false)
 *
 * Output:
 *   Complete ability registration code printed to stdout
 *
 * Exit Codes:
 *   0 - Success
 *   1 - Missing required arguments
 *   2 - Invalid argument values
 */

// Parse command-line arguments
$options = getopt('', [
	'name:',
	'type:',
	'category:',
	'label::',
	'description::',
	'readonly::',
	'destructive::',
	'idempotent::',
]);

// Validate required arguments
$required = ['name', 'type', 'category'];
$missing = array_diff($required, array_keys($options));

if (!empty($missing)) {
	fwrite(STDERR, "Error: Missing required arguments: " . implode(', ', $missing) . "\n");
	fwrite(STDERR, "Usage: php scaffold-ability.php --name=\"plugin/ability\" --type=\"server\" --category=\"data-retrieval\"\n");
	exit(1);
}

// Extract and validate arguments
$name = $options['name'];
$type = strtolower($options['type']);
$category = $options['category'];

// Validate ability name format
if (!preg_match('/^[a-z0-9-]+\/[a-z0-9-]+$/', $name)) {
	fwrite(STDERR, "Error: Invalid ability name format. Must be 'namespace/ability-name' (lowercase, hyphens allowed)\n");
	exit(2);
}

// Validate type
if (!in_array($type, ['server', 'client'])) {
	fwrite(STDERR, "Error: Invalid type. Must be 'server' or 'client'\n");
	exit(2);
}

// Parse optional arguments with defaults
$label = $options['label'] ?? generate_label_from_name($name);
$description = $options['description'] ?? 'TODO: Add a detailed description of what this ability does.';
$readonly = parse_bool($options['readonly'] ?? 'false');
$destructive = parse_bool($options['destructive'] ?? 'true');
$idempotent = parse_bool($options['idempotent'] ?? 'false');

// Load the appropriate template and generate code
$template_file = $type === 'server'
	? __DIR__ . '/../assets/server-ability-template.php'
	: __DIR__ . '/../assets/client-ability-template.js';

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
$namespace = explode('/', $name)[0];
$ability_slug = str_replace(['/', '-'], '_', $name);

$placeholders = [
	'{{ABILITY_NAME}}' => $name,
	'{{NAMESPACE}}' => $namespace,
	'{{LABEL}}' => $label,
	'{{DESCRIPTION}}' => $description,
	'{{CATEGORY}}' => $category,
	'{{CALLBACK_FUNCTION}}' => $ability_slug . '_callback',
	'{{REGISTER_FUNCTION}}' => $ability_slug . '_register',
	'{{READONLY}}' => $readonly ? 'true' : 'false',
	'{{DESTRUCTIVE}}' => $destructive ? 'true' : 'false',
	'{{IDEMPOTENT}}' => $idempotent ? 'true' : 'false',
];

// Replace placeholders
$output = str_replace(array_keys($placeholders), array_values($placeholders), $template);

// Output the result
echo $output;

exit(0);

/**
 * Generate a human-readable label from the ability name.
 *
 * @param string $name Ability name in format "namespace/ability-name"
 * @return string Human-readable label
 */
function generate_label_from_name($name) {
	$parts = explode('/', $name);
	$ability_part = end($parts);
	$words = explode('-', $ability_part);
	return ucwords(implode(' ', $words));
}

/**
 * Parse boolean string to actual boolean.
 *
 * @param string $value String value ("true" or "false")
 * @return bool
 */
function parse_bool($value) {
	return strtolower($value) === 'true';
}
