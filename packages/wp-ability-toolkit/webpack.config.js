/**
 * External dependencies
 */
const defaultConfig = require('@wordpress/scripts/config/webpack.config');
const DependencyExtractionWebpackPlugin = require('@wordpress/dependency-extraction-webpack-plugin');
const path = require('path');

// Find and remove the default DependencyExtractionWebpackPlugin
const plugins = defaultConfig.plugins.filter(
	(plugin) => !(plugin instanceof DependencyExtractionWebpackPlugin)
);

// Add custom DependencyExtractionWebpackPlugin
// Keep defaults but add custom mapping for @wordpress/abilities
plugins.push(
	new DependencyExtractionWebpackPlugin({
		requestToExternal: (request) => {
			// Custom mapping for WordPress Abilities
			if (request === '@wordpress/abilities') {
				return ['wp', 'abilities'];
			}
			// Let plugin handle defaults
			return undefined;
		},
		requestToHandle: (request) => {
			// Map to wp-abilities script handle
			if (request === '@wordpress/abilities') {
				return 'wp-abilities';
			}
			// Let plugin handle defaults
			return undefined;
		},
	})
);

module.exports = {
	...defaultConfig,
	entry: {
		'chat-widget/index': path.resolve(
			__dirname,
			'src/chat-widget/index.tsx'
		),
		'admin/settings': path.resolve(__dirname, 'src/admin/settings.tsx'),
	},
	output: {
		path: path.resolve(__dirname, 'build'),
		filename: '[name].js',
	},
	plugins,
};
