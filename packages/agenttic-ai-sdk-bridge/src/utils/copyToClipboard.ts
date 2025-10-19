/**
 * Shared clipboard copy utility with state management
 */

export async function copyToClipboard(
	text: string,
	setCopied: (value: boolean) => void
): Promise<void> {
	try {
		await navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 1000);
	} catch (err) {
		console.error('Failed to copy:', err);
	}
}
