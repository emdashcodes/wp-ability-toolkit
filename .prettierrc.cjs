// Import the default config file and expose it in the project root.
// Useful for editor integrations.
module.exports = {
	...require('@wordpress/prettier-config'),
	overrides: [
		{
			files: ['*.md'],
			options: {
				useTabs: false,
				tabWidth: 2,
				printWidth: 80,
				proseWrap: 'preserve',
			},
		},
		{
			files: ['changelog.txt'],
			options: { parser: 'markdown' },
		},
	],
};
