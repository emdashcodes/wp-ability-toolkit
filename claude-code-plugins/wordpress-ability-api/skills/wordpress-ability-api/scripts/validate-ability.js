#!/usr/bin/env node
/**
 * WordPress Ability Validation Script (JavaScript)
 *
 * Validates JavaScript ability registration code using acorn AST parser.
 * For PHP validation, use validate-ability.php instead.
 *
 * Usage:
 *   node validate-ability.js path/to/ability-file.js
 *
 * Requirements:
 *   - Node.js
 *   - acorn parser: npm install acorn
 *
 * Arguments:
 *   file_path    Path to the JavaScript file containing ability registration
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
	console.error('Usage: node validate-ability.js path/to/ability-file.js');
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
		'Error: This validator only supports JavaScript files. For PHP validation, use validate-ability.php'
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

// Parse and validate JavaScript abilities
try {
	const ast = acorn.parse(content, {
		sourceType: 'module',
		ecmaVersion: 'latest',
		allowAwaitOutsideFunction: true,
	});

	const abilities = extractAbilities(ast);

	if (abilities.length === 0) {
		errors.push('No registerAbility() calls found in file');
	} else {
		abilities.forEach((ability) => {
			console.log(`Validating ability: ${ability.name || '(unnamed)'}`);
			validateAbility(ability, errors, warnings);
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
 * Extract ability registrations from AST.
 *
 * @param {Object} ast - Acorn AST
 * @returns {Array} Array of ability objects
 */
function extractAbilities(ast) {
	const abilities = [];
	const processed = new Set(); // Track processed nodes to avoid duplicates

	// Walk the AST to find registerAbility calls
	walk(ast, (node) => {
		let callNode = null;

		// Direct call: registerAbility()
		if (
			node.type === 'CallExpression' &&
			node.callee.type === 'Identifier' &&
			node.callee.name === 'registerAbility' &&
			!processed.has(node)
		) {
			callNode = node;
		}

		// Await call: await registerAbility()
		if (
			node.type === 'AwaitExpression' &&
			node.argument.type === 'CallExpression' &&
			node.argument.callee.type === 'Identifier' &&
			node.argument.callee.name === 'registerAbility' &&
			!processed.has(node.argument)
		) {
			callNode = node.argument;
		}

		if (callNode) {
			processed.add(callNode);
			const ability = extractAbilityFromCall(callNode);
			if (ability) {
				abilities.push(ability);
			}
		}
	});

	return abilities;
}

/**
 * Extract ability data from a CallExpression node.
 *
 * @param {Object} node - CallExpression AST node
 * @returns {Object|null} Ability object or null
 */
function extractAbilityFromCall(node) {
	if (node.arguments.length < 1) {
		return null;
	}

	const ability = {
		name: null,
		label: null,
		description: null,
		category: null,
		hasCallback: false,
		hasPermissionCallback: false,
		hasInputSchema: false,
		hasOutputSchema: false,
		annotations: {},
	};

	// First argument: config object
	const configArg = node.arguments[0];
	if (configArg.type !== 'ObjectExpression') {
		return null; // Config must be an object
	}

	// Extract properties from config object
	configArg.properties.forEach((prop) => {
		if (prop.type !== 'Property' || prop.key.type !== 'Identifier') {
			return;
		}

		const key = prop.key.name;

		// Extract string fields
		if (['name', 'label', 'description', 'category'].includes(key)) {
			if (
				prop.value.type === 'Literal' &&
				typeof prop.value.value === 'string'
			) {
				ability[key] = prop.value.value;
			}
		}

		// Check for callback (function or arrow function)
		if (key === 'callback') {
			ability.hasCallback = [
				'FunctionExpression',
				'ArrowFunctionExpression',
			].includes(prop.value.type);
		}

		// Check for permissionCallback
		if (key === 'permissionCallback') {
			ability.hasPermissionCallback = [
				'FunctionExpression',
				'ArrowFunctionExpression',
			].includes(prop.value.type);
		}

		// Check for schemas (object expressions)
		if (key === 'inputSchema' && prop.value.type === 'ObjectExpression') {
			ability.hasInputSchema = true;
		}

		if (key === 'outputSchema' && prop.value.type === 'ObjectExpression') {
			ability.hasOutputSchema = true;
		}

		// Extract annotations from meta
		if (key === 'meta' && prop.value.type === 'ObjectExpression') {
			prop.value.properties.forEach((metaProp) => {
				if (
					metaProp.type === 'Property' &&
					metaProp.key.type === 'Identifier' &&
					metaProp.key.name === 'annotations' &&
					metaProp.value.type === 'ObjectExpression'
				) {
					metaProp.value.properties.forEach((annoProp) => {
						if (
							annoProp.type === 'Property' &&
							annoProp.key.type === 'Identifier'
						) {
							const annoKey = annoProp.key.name;
							if (
								[
									'readonly',
									'destructive',
									'idempotent',
								].includes(annoKey)
							) {
								if (
									annoProp.value.type === 'Literal' &&
									typeof annoProp.value.value === 'boolean'
								) {
									ability.annotations[annoKey] =
										annoProp.value.value;
								}
							}
						}
					});
				}
			});
		}
	});

	return ability;
}

/**
 * Validate ability data.
 *
 * @param {Object} ability - Ability data
 * @param {Array} errors - Error messages array
 * @param {Array} warnings - Warning messages array
 */
function validateAbility(ability, errors, warnings) {
	const {
		name,
		label,
		description,
		category,
		hasCallback,
		hasPermissionCallback,
		hasInputSchema,
		hasOutputSchema,
		annotations,
	} = ability;

	// Validate required fields
	if (!name) {
		errors.push('Missing required field: name');
		return; // Can't continue without a name
	}

	// Validate name format (namespace/ability-name in kebab-case)
	if (!/^[a-z0-9-]+\/[a-z0-9-]+$/.test(name)) {
		errors.push(
			`Invalid ability name format: '${name}'. Must be 'namespace/ability-name' in kebab-case (e.g., 'my-plugin/do-something')`
		);
	}

	if (!label) {
		errors.push(`Missing required field 'label' in ability '${name}'`);
	} else {
		// Validate label quality
		if (label.trim().length < 2) {
			warnings.push(
				`Label for ability '${name}' is too short. Provide a meaningful label.`
			);
		}
	}

	if (!description) {
		errors.push(
			`Missing required field 'description' in ability '${name}'`
		);
	} else {
		// Validate description quality
		const descLength = description.trim().length;

		if (descLength < 20) {
			warnings.push(
				`Description for ability '${name}' is too short (${descLength} chars). Provide detailed information about what this ability does, when to use it, and what parameters it accepts.`
			);
		}

		if (/TODO/i.test(description)) {
			warnings.push(
				`Description for ability '${name}' contains TODO placeholder. Replace with actual description.`
			);
		}
	}

	if (!category) {
		errors.push(`Missing required field 'category' in ability '${name}'`);
	}

	// Validate callback presence
	if (!hasCallback) {
		errors.push(
			`Missing required field 'callback' in ability '${name}'. Abilities must have an execute callback function.`
		);
	}

	// Validate permission callback
	if (!hasPermissionCallback) {
		warnings.push(
			`Missing 'permissionCallback' in ability '${name}'. Consider adding permission checks to control who can execute this ability.`
		);
	}

	// Validate schemas (recommended if ability takes input or provides output)
	if (!hasInputSchema) {
		warnings.push(
			`Missing 'inputSchema' in ability '${name}'. Input schema should be provided if this ability accepts parameters.`
		);
	}

	if (!hasOutputSchema) {
		warnings.push(
			`Missing 'outputSchema' in ability '${name}'. Output schema should be provided if this ability returns data.`
		);
	}

	// Validate annotations
	if ('readonly' in annotations && 'destructive' in annotations) {
		if (annotations.readonly === true && annotations.destructive === true) {
			warnings.push(
				`Conflicting annotations in ability '${name}': readonly=true and destructive=true. A readonly ability should have destructive=false.`
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
