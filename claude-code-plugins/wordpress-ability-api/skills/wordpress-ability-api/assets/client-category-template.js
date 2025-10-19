/**
 * Register ability category: {{LABEL}}
 *
 * {{DESCRIPTION}}
 *
 * Note: This must be called BEFORE registering abilities that use this category.
 * Typically placed at the top of your abilities registration file.
 */

import { registerAbilityCategory } from '@wordpress/abilities';

await registerAbilityCategory('{{CATEGORY_NAME}}', {
	label: '{{LABEL}}',
	description: '{{DESCRIPTION}}',
});
