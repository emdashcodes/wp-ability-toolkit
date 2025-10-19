/**
 * Type declarations for CSS/SCSS module imports
 * This allows importing .css and .scss files without TypeScript errors
 */

declare module '*.css' {
	const content: Record<string, string>;
	export default content;
}

declare module '*.scss' {
	const content: Record<string, string>;
	export default content;
}
