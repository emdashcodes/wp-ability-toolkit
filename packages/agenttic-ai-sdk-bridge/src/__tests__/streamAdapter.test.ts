/**
 * Basic test for streamAdapter module
 */
import { accumulateStreamText } from '../streamAdapter';

describe('streamAdapter', () => {
	describe('accumulateStreamText', () => {
		it('should accumulate text from string deltas', () => {
			const chunks = [
				{ delta: 'Hello' },
				{ delta: ' ' },
				{ delta: 'World' },
			];

			const result = accumulateStreamText(chunks);

			expect(result).toBe('Hello World');
		});

		it('should accumulate text from object deltas with content property', () => {
			const chunks = [
				{ delta: { content: 'TypeScript' } },
				{ delta: { content: ' is' } },
				{ delta: { content: ' awesome' } },
			];

			const result = accumulateStreamText(chunks);

			expect(result).toBe('TypeScript is awesome');
		});

		it('should handle mixed delta types', () => {
			const chunks = [
				{ delta: 'Mixed ' },
				{ delta: { content: 'content' } },
				{ content: ' types' },
			];

			const result = accumulateStreamText(chunks);

			expect(result).toBe('Mixed content types');
		});

		it('should handle empty chunks array', () => {
			const chunks: any[] = [];

			const result = accumulateStreamText(chunks);

			expect(result).toBe('');
		});

		it('should skip chunks without delta or content', () => {
			const chunks = [
				{ delta: 'Valid' },
				{ other: 'property' },
				{ delta: ' text' },
			];

			const result = accumulateStreamText(chunks);

			expect(result).toBe('Valid text');
		});
	});
});
