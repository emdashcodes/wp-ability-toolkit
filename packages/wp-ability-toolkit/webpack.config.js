/**
 * External dependencies
 */
const defaultConfig = require('@wordpress/scripts/config/webpack.config');
const path = require('path');

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
	externals: {
		react: 'wp.element',
		'react-dom': 'wp.element',
		'@wordpress/element': 'wp.element',
		'@wordpress/i18n': 'wp.i18n',
		'@wordpress/components': 'wp.components',
		'@wordpress/api-fetch': 'wp.apiFetch',
		'@wordpress/data': 'wp.data',
		// Note: @wordpress/icons is NOT externalized - it will be bundled
	},
};
