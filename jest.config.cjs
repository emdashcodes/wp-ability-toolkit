module.exports = {
	preset: '@wordpress/jest-preset-default',
	testEnvironment: 'jsdom',
	roots: ['<rootDir>/packages'],
	testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
	moduleNameMapper: {
		'\\.(css|less|scss|sass)$': 'identity-obj-proxy',
	},
	extensionsToTreatAsEsm: ['.ts', '.tsx'],
	collectCoverageFrom: [
		'packages/**/src/**/*.{js,jsx,ts,tsx}',
		'!packages/**/src/**/*.d.ts',
		'!packages/**/src/**/*.stories.{js,jsx,ts,tsx}',
		'!packages/**/build/**',
		'!packages/**/dist/**',
		'!packages/**/node_modules/**',
	],
	coverageThreshold: {
		global: {
			branches: 50,
			functions: 50,
			lines: 50,
			statements: 50,
		},
	},
	setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
};
