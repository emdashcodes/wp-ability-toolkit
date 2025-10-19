/**
 * Chat Header with Clear and Minimize buttons
 */

import { Button } from '@wordpress/components';
import { trash } from '@wordpress/icons';
import { __ } from '@wordpress/i18n';
import { createElement } from '@wordpress/element';

interface ChatHeaderProps {
	onClear?: () => void;
	onMinimize?: () => void;
}

// Minimize icon (horizontal line)
const minimizeIcon = createElement(
	'svg',
	{
		width: 24,
		height: 24,
		viewBox: '0 0 24 24',
		xmlns: 'http://www.w3.org/2000/svg',
	},
	createElement('path', {
		d: 'M5 11.25h14v1.5H5z',
	})
);

export function ChatHeader({ onClear, onMinimize }: ChatHeaderProps) {
	return (
		<div
			className="wp-ability-toolkit-chat-header"
			data-slot="chat-header"
			style={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				padding: '8px',
				gap: '4px',
			}}
		>
			<div style={{ flex: 1 }} />
			<div style={{ display: 'flex', gap: '4px' }}>
				{onClear && (
					<Button
						icon={trash}
						onClick={onClear}
						label={__('Clear conversation', 'wp-ability-toolkit')}
						showTooltip={true}
						style={{
							minWidth: '28px',
							width: '28px',
							height: '28px',
							padding: '4px',
						}}
					/>
				)}
				{onMinimize && (
					<Button
						icon={minimizeIcon}
						onClick={onMinimize}
						label={__('Minimize', 'wp-ability-toolkit')}
						showTooltip={true}
						style={{
							minWidth: '28px',
							width: '28px',
							height: '28px',
							padding: '4px',
						}}
					/>
				)}
			</div>
		</div>
	);
}
