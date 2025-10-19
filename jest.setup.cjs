// Setup file for Jest tests
require('@testing-library/jest-dom');

// Mock WordPress globals
global.wp = {
	element: require('@wordpress/element'),
	components: require('@wordpress/components'),
	icons: require('@wordpress/icons'),
};
