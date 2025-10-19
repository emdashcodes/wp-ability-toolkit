#!/usr/bin/env node
/**
 * WordPress Ability Category Validation Script (JavaScript)
 *
 * Validates JavaScript category registration code using acorn AST parser.
 * For PHP validation, use validate-category.php instead.
 *
 * Usage:
 *   node validate-category.js path/to/category-file.js
 *
 * Requirements:
 *   - Node.js
 *   - acorn parser: npm install acorn
 *
 * Arguments:
 *   file_path    Path to the JavaScript file containing category registration
 *
 * Exit Codes:
 *   0 - Validation passed
 *   1 - Validation failed
 *   2 - File not found, invalid usage, or missing dependencies
 */

const fs = require('fs');
const path = require('path');

// Check for acorn dependency
let acorn;
try {
	acorn = require('acorn');
} catch (e) {
	console.error(
		'Error: acorn parser not found. Install with: npm install acorn'
	);
	process.exit(2);
}

// Check for file argument
if (process.argv.length < 3) {
	console.error('Usage: node validate-category.js path/to/category-file.js');
	process.exit(2);
}

const filePath = process.argv[2];

// Check if file exists
if (!fs.existsSync(filePath)) {
	console.error(`Error: File not found: ${filePath}`);
	process.exit(2);
}

// Check if file is JavaScript
const ext = path.extname(filePath);
if (!['.js', '.jsx', '.ts', '.tsx', '.mjs'].includes(ext)) {
	console.error(
		'Error: This validator only supports JavaScript files. For PHP validation, use validate-category.php'
	);
	process.exit(2);
}

// Read file contents
let content;
try {
	content = fs.readFileSync(filePath, 'utf8');
} catch (e) {
	console.error(`Error: Unable to read file: ${filePath}`);
	process.exit(2);
}

// Initialize validation results
const errors = [];
const warnings = [];

// Parse and validate JavaScript categories
try {
	const ast = acorn.parse(content, {
		sourceType: 'module',
		ecmaVersion: 'latest',
		allowAwaitOutsideFunction: true,
	});

	const categories = extractCategories(ast);

	if (categories.length === 0) {
		errors.push('No registerAbilityCategory() calls found in file');
	} else {
		categories.forEach((category) => {
			console.log(`Validating category: ${category.name}`);
			validateCategory(category, errors, warnings);
			console.log('');
		});
	}
} catch (e) {
	if (e instanceof SyntaxError) {
		errors.push(`JavaScript syntax error: ${e.message}`);
	} else {
		throw e;
	}
}

// Output final results
outputResults(filePath, errors, warnings);

// Exit with appropriate code
process.exit(errors.length > 0 ? 1 : 0);

/**
 * Extract category registrations from AST.
 *
 * @param {Object} ast - Acorn AST
 * @returns {Array} Array of category objects
 */
function extractCategories(ast) {
	const categories = [];
	const processed = new Set(); // Track processed nodes to avoid duplicates

	// Walk the AST to find registerAbilityCategory calls
	walk(ast, (node) => {
		let callNode = null;

		// Direct call: registerAbilityCategory()
		if (
			node.type === 'CallExpression' &&
			node.callee.type === 'Identifier' &&
			node.callee.name === 'registerAbilityCategory' &&
			!processed.has(node)
		) {
			callNode = node;
		}

		// Await call: await registerAbilityCategory()
		if (
			node.type === 'AwaitExpression' &&
			node.argument.type === 'CallExpression' &&
			node.argument.callee.type === 'Identifier' &&
			node.argument.callee.name === 'registerAbilityCategory' &&
			!processed.has(node.argument)
		) {
			callNode = node.argument;
		}

		if (callNode) {
			processed.add(callNode);
			const category = extractCategoryFromCall(callNode);
			if (category) {
				categories.push(category);
			}
		}
	});

	return categories;
}

/**
 * Extract category data from a CallExpression node.
 *
 * @param {Object} node - CallExpression AST node
 * @returns {Object|null} Category object or null
 */
function extractCategoryFromCall(node) {
	if (node.arguments.length < 2) {
		return null;
	}

	const category = {
		name: null,
		label: null,
		description: null,
	};

	// First argument: category name (string literal)
	const nameArg = node.arguments[0];
	if (nameArg.type === 'Literal' && typeof nameArg.value === 'string') {
		category.name = nameArg.value;
	} else {
		return null; // Name must be a string literal
	}

	// Second argument: config object
	const configArg = node.arguments[1];
	if (configArg.type === 'ObjectExpression') {
		configArg.properties.forEach((prop) => {
			if (prop.type === 'Property' && prop.key.type === 'Identifier') {
				const key = prop.key.name;
				if (
					(key === 'label' || key === 'description') &&
					prop.value.type === 'Literal' &&
					typeof prop.value.value === 'string'
				) {
					category[key] = prop.value.value;
				}
			}
		});
	}

	return category;
}

/**
 * Validate category data.
 *
 * @param {Object} category - Category data
 * @param {Array} errors - Error messages array
 * @param {Array} warnings - Warning messages array
 */
function validateCategory(category, errors, warnings) {
	const { name, label, description } = category;

	// Validate category name format (kebab-case)
	if (!/^[a-z0-9-]+$/.test(name)) {
		errors.push(
			`Invalid category name format: '${name}'. Must be kebab-case (lowercase, hyphens allowed)`
		);
	}

	// Check required fields
	if (!label) {
		errors.push(`Missing required field 'label' in category '${name}'`);
	} else {
		// Validate label quality
		if (label.trim().length < 2) {
			warnings.push(
				`Label for category '${name}' is too short. Provide a meaningful label.`
			);
		}
	}

	if (!description) {
		errors.push(
			`Missing required field 'description' in category '${name}'`
		);
	} else {
		// Validate description quality
		const descLength = description.trim().length;

		if (descLength < 15) {
			warnings.push(
				`Description for category '${name}' is too short (${descLength} chars). Provide detailed information about what abilities belong in this category.`
			);
		}

		if (/TODO/i.test(description)) {
			warnings.push(
				`Description for category '${name}' contains TODO placeholder. Replace with actual description.`
			);
		}
	}
}

/**
 * Simple AST walker.
 *
 * @param {Object} node - AST node
 * @param {Function} callback - Function to call for each node
 */
function walk(node, callback) {
	if (!node || typeof node !== 'object') {
		return;
	}

	callback(node);

	for (const key in node) {
		if (
			key === 'loc' ||
			key === 'range' ||
			key === 'start' ||
			key === 'end'
		) {
			continue; // Skip position metadata
		}

		const value = node[key];
		if (Array.isArray(value)) {
			value.forEach((child) => walk(child, callback));
		} else if (value && typeof value === 'object') {
			walk(value, callback);
		}
	}
}

/**
 * Output validation results.
 *
 * @param {string} filePath - File being validated
 * @param {Array} errors - Error messages
 * @param {Array} warnings - Warning messages
 */
function outputResults(filePath, errors, warnings) {
	console.log('='.repeat(70));
	console.log(`Validation Results: ${filePath}`);
	console.log('='.repeat(70));
	console.log('');

	if (errors.length > 0) {
		console.log(`ERRORS (${errors.length}):`);
		errors.forEach((error) => console.log(`  ✗ ${error}`));
		console.log('');
	}

	if (warnings.length > 0) {
		console.log(`WARNINGS (${warnings.length}):`);
		warnings.forEach((warning) => console.log(`  ⚠ ${warning}`));
		console.log('');
	}

	if (errors.length === 0 && warnings.length === 0) {
		console.log('✓ All validations passed! No issues found.');
		console.log('');
	} else if (errors.length === 0) {
		console.log('✓ Validation passed with warnings.');
		console.log('');
	} else {
		console.log('✗ Validation failed. Please fix the errors above.');
		console.log('');
	}
}
