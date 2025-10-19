import js from '@eslint/js';
import globals from 'globals';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default [
	// Ignore patterns
	{
		ignores: [
			'**/node_modules/**',
			'**/vendor/**',
			'**/build/**',
			'**/dist/**',
			'**/*.min.js',
			'**/*.d.ts',
			'packages/wp-ability-toolkit/webpack.config.js',
			'claude-code-plugins/**/scripts/**',
			'claude-code-plugins/**/assets/**',
		],
	},

	// Base JavaScript config
	js.configs.recommended,

	// TypeScript config for all packages
	...tseslint.configs.recommended.map((config) => ({
		...config,
		files: ['packages/**/*.ts', 'packages/**/*.tsx'],
		rules: {
			...config.rules,
			'@typescript-eslint/no-explicit-any': 'warn', // Warn instead of error
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
			],
			'@typescript-eslint/ban-ts-comment': 'warn', // Warn instead of error
		},
	})),

	// React + TypeScript config for plugin package
	{
		files: ['packages/wp-ability-toolkit/src/**/*.{js,jsx,ts,tsx}'],
		plugins: {
			react: reactPlugin,
			'react-hooks': reactHooksPlugin,
		},
		languageOptions: {
			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
			},
			globals: {
				...globals.browser,
				wp: 'readonly',
				jQuery: 'readonly',
			},
		},
		rules: {
			...reactPlugin.configs.recommended.rules,
			...reactHooksPlugin.configs.recommended.rules,
			'react/react-in-jsx-scope': 'off', // Not needed with @wordpress/element
			'react/prop-types': 'off', // Using TypeScript for type checking
		},
		settings: {
			react: {
				version: '18.0',
			},
		},
	},

	// CommonJS files (.cjs)
	{
		files: ['**/*.cjs'],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'commonjs',
			globals: {
				...globals.node,
			},
		},
		rules: {
			'no-console': ['warn', { allow: ['warn', 'error'] }],
			'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
			'prefer-const': 'error',
			'no-var': 'error',
			camelcase: 'off',
			'comma-dangle': ['error', 'always-multiline'],
			eqeqeq: ['error', 'always'],
			indent: ['error', 'tab', { SwitchCase: 1 }],
			quotes: ['error', 'single', { avoidEscape: true }],
			semi: ['error', 'always'],
		},
	},

	// General JavaScript files only
	{
		files: ['**/*.js', '**/*.jsx'],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: {
				...globals.node,
				...globals.es2021,
			},
		},
		rules: {
			// WordPress coding standards inspired rules
			'no-console': ['warn', { allow: ['warn', 'error'] }],
			'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
			'prefer-const': 'error',
			'no-var': 'error',
			camelcase: 'off', // Disabled due to WordPress naming conventions
			'comma-dangle': ['error', 'always-multiline'],
			eqeqeq: ['error', 'always'],
			indent: ['error', 'tab', { SwitchCase: 1 }],
			quotes: ['error', 'single', { avoidEscape: true }],
			semi: ['error', 'always'],
			'space-before-function-paren': [
				'error',
				{
					anonymous: 'always',
					named: 'never',
					asyncArrow: 'always',
				},
			],
		},
	},
];
