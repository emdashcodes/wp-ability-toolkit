/**
 * Tool Call Display Component
 * Shows tool execution status and results in the chat UI
 */

import React from 'react';
import { useState } from '@wordpress/element';
import { Spinner, Icon, Tooltip, Button } from '@wordpress/components';
import {
	check,
	closeSmall,
	update,
	chevronUp,
	chevronDown,
	copySmall,
} from '@wordpress/icons';
import { dispatch } from '@wordpress/data';
import type { ToolCallContent } from '../types.js';

export interface ToolCallProps {
	toolCall: ToolCallContent;
}

export function ToolCall({ toolCall }: ToolCallProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [copiedInput, setCopiedInput] = useState(false);
	const [copiedOutput, setCopiedOutput] = useState(false);
	const [copiedInfo, setCopiedInfo] = useState(false);

	const getStatusIcon = () => {
		switch (toolCall.status) {
			case 'pending':
				return (
					<Spinner
						style={{ margin: 0, width: '16px', height: '16px' }}
					/>
				);
			case 'success':
				return <Icon icon={check} size={16} />;
			case 'error':
				return <Icon icon={closeSmall} size={16} />;
			default:
				return <Icon icon={update} size={16} />;
		}
	};

	const getStatusClass = () => {
		switch (toolCall.status) {
			case 'pending':
				return 'tool-call-pending';
			case 'success':
				return 'tool-call-success';
			case 'error':
				return 'tool-call-error';
			default:
				return 'tool-call-default';
		}
	};

	const getStatusText = () => {
		switch (toolCall.status) {
			case 'pending':
				return 'Executing...';
			case 'success':
				return 'Completed';
			case 'error':
				return 'Failed';
			default:
				return 'Unknown';
		}
	};

	const copyToClipboard = async (
		text: string,
		setCopied: (value: boolean) => void,
		message: string = 'Copied to clipboard'
	) => {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);

			// Show WordPress toast notification
			// @ts-ignore - WordPress notices API
			dispatch('core/notices').createNotice('success', message, {
				type: 'snackbar',
				isDismissible: true,
			});
		} catch (err) {
			console.error('Failed to copy:', err);
			// @ts-ignore - WordPress notices API
			dispatch('core/notices').createNotice(
				'error',
				'Failed to copy to clipboard',
				{
					type: 'snackbar',
					isDismissible: true,
				}
			);
		}
	};

	return (
		<div
			className={`tool-call-wrapper ${getStatusClass()}`}
			style={{
				marginTop: '8px',
				marginBottom: '8px',
				border: '1px solid #dcdcde',
				borderRadius: '4px',
				overflow: 'hidden',
				width: '100%',
				maxWidth: '100%',
				minWidth: 0,
				boxSizing: 'border-box',
			}}
		>
			<div
				className="tool-call-header"
				onClick={() => setIsOpen(!isOpen)}
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: '8px',
					padding: '10px 14px',
					cursor: 'pointer',
					userSelect: 'none',
					fontSize: '11px',
					transition: 'background-color 0.1s ease',
					minWidth: 0,
					width: '100%',
					maxWidth: '100%',
					boxSizing: 'border-box',
					overflow: 'hidden',
				}}
			>
				<Tooltip text={getStatusText()}>
					<span
						style={{
							display: 'flex',
							alignItems: 'center',
							flexShrink: 0,
						}}
					>
						{getStatusIcon()}
					</span>
				</Tooltip>
				<Tooltip text={toolCall.name}>
					<span
						style={{
							fontWeight: 600,
							flex: 1,
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							whiteSpace: 'nowrap',
							minWidth: 0,
						}}
					>
						{toolCall.name}
					</span>
				</Tooltip>
				<Icon
					icon={isOpen ? chevronUp : chevronDown}
					size={18}
					style={{
						color: '#757575',
						flexShrink: 0,
					}}
				/>
			</div>

			{isOpen && (
				<div
					className="tool-call-body"
					style={{
						padding: '16px',
						borderTop: '1px solid #f0f0f1',
						overflow: 'hidden',
						minWidth: 0,
						width: '100%',
						maxWidth: '100%',
						boxSizing: 'border-box',
					}}
				>
					{/* Ability Info Box */}
					<div style={{ marginBottom: '16px', minWidth: 0 }}>
						<div
							style={{
								fontWeight: 600,
								fontSize: '11px',
								color: '#757575',
								marginBottom: '6px',
								textTransform: 'uppercase',
								letterSpacing: '0.5px',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'space-between',
							}}
						>
							<span>Ability Info</span>
							<Tooltip
								text={
									copiedInfo ? 'Copied!' : 'Copy ability info'
								}
							>
								<Button
									icon={copySmall}
									size="small"
									variant="secondary"
									onClick={(e: React.MouseEvent) => {
										e.stopPropagation();
										const infoText = `${toolCall.name}\nID: ${toolCall.id}`;
										copyToClipboard(
											infoText,
											setCopiedInfo,
											'Ability info copied to clipboard'
										);
									}}
									style={{
										minWidth: 'auto',
										height: '24px',
										padding: '0 8px',
									}}
								/>
							</Tooltip>
						</div>
						<pre
							style={{
								backgroundColor: '#f6f7f7',
								border: '1px solid #dcdcde',
								padding: '12px',
								borderRadius: '4px',
								overflow: 'auto',
								margin: 0,
								fontSize: '12px',
								fontFamily: 'Consolas, Monaco, monospace',
								maxHeight: '200px',
								width: '100%',
								lineHeight: '1.5',
								whiteSpace: 'pre',
								boxSizing: 'border-box',
							}}
						>
							{toolCall.name}
							{'\n'}ID: {toolCall.id}
						</pre>
					</div>

					{/* Input */}
					{toolCall.input && (
						<div style={{ marginBottom: '16px', minWidth: 0 }}>
							<div
								style={{
									fontWeight: 600,
									fontSize: '11px',
									color: '#757575',
									marginBottom: '6px',
									textTransform: 'uppercase',
									letterSpacing: '0.5px',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'space-between',
								}}
							>
								<span>Input</span>
								<Tooltip
									text={
										copiedInput ? 'Copied!' : 'Copy input'
									}
								>
									<Button
										icon={copySmall}
										size="small"
										variant="secondary"
										onClick={(e: React.MouseEvent) => {
											e.stopPropagation();
											copyToClipboard(
												JSON.stringify(
													toolCall.input,
													null,
													2
												),
												setCopiedInput,
												'Input copied to clipboard'
											);
										}}
										style={{
											minWidth: 'auto',
											height: '24px',
											padding: '0 8px',
										}}
									/>
								</Tooltip>
							</div>
							<pre
								style={{
									backgroundColor: '#f6f7f7',
									border: '1px solid #dcdcde',
									padding: '12px',
									borderRadius: '4px',
									overflow: 'auto',
									margin: 0,
									fontSize: '12px',
									fontFamily: 'Consolas, Monaco, monospace',
									maxHeight: '200px',
									width: '100%',
									lineHeight: '1.5',
									whiteSpace: 'pre',
									boxSizing: 'border-box',
								}}
							>
								{JSON.stringify(toolCall.input, null, 2)}
							</pre>
						</div>
					)}

					{/* Output */}
					{toolCall.status === 'success' && toolCall.output && (
						<div style={{ marginBottom: '16px', minWidth: 0 }}>
							<div
								style={{
									fontWeight: 600,
									fontSize: '11px',
									color: '#757575',
									marginBottom: '6px',
									textTransform: 'uppercase',
									letterSpacing: '0.5px',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'space-between',
								}}
							>
								<span>Output</span>
								<Tooltip
									text={
										copiedOutput ? 'Copied!' : 'Copy output'
									}
								>
									<Button
										icon={copySmall}
										size="small"
										variant="secondary"
										onClick={(e: React.MouseEvent) => {
											e.stopPropagation();
											const outputText =
												typeof toolCall.output ===
												'string'
													? toolCall.output
													: JSON.stringify(
															toolCall.output,
															null,
															2
														);
											copyToClipboard(
												outputText,
												setCopiedOutput,
												'Output copied to clipboard'
											);
										}}
										style={{
											minWidth: 'auto',
											height: '24px',
											padding: '0 8px',
										}}
									/>
								</Tooltip>
							</div>
							<pre
								style={{
									backgroundColor: '#f6f7f7',
									border: '1px solid #dcdcde',
									padding: '12px',
									borderRadius: '4px',
									overflow: 'auto',
									margin: 0,
									fontSize: '12px',
									fontFamily: 'Consolas, Monaco, monospace',
									maxHeight: '200px',
									width: '100%',
									lineHeight: '1.5',
									whiteSpace: 'pre',
									boxSizing: 'border-box',
								}}
							>
								{typeof toolCall.output === 'string'
									? toolCall.output
									: JSON.stringify(toolCall.output, null, 2)}
							</pre>
						</div>
					)}

					{/* Error */}
					{toolCall.status === 'error' && toolCall.error && (
						<div style={{ marginBottom: '16px', minWidth: 0 }}>
							<div
								style={{
									fontWeight: 600,
									fontSize: '11px',
									color: '#757575',
									marginBottom: '6px',
									textTransform: 'uppercase',
									letterSpacing: '0.5px',
								}}
							>
								Error
							</div>
							<div
								style={{
									backgroundColor: '#fcf0f1',
									border: '1px solid #d63638',
									color: '#d63638',
									padding: '12px',
									borderRadius: '4px',
									fontSize: '13px',
									lineHeight: '1.5',
									overflow: 'auto',
									width: '100%',
									maxHeight: '200px',
									whiteSpace: 'pre-wrap',
									wordBreak: 'break-word',
									boxSizing: 'border-box',
								}}
							>
								{toolCall.error}
							</div>
						</div>
					)}
				</div>
			)}

			<style>{`
        .tool-call-wrapper {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
          contain: layout;
        }

        .tool-call-wrapper pre {
          overflow-wrap: normal;
          word-wrap: normal;
        }

        .tool-call-pending {
          border-left: 3px solid #2271b1 !important;
        }

        .tool-call-pending .tool-call-header {
          background-color: #f0f6fc;
        }

        .tool-call-success {
          border-left: 3px solid #00a32a !important;
        }

        .tool-call-success .tool-call-header {
          background-color: #f6faf6;
        }

        .tool-call-error {
          border-left: 3px solid #d63638 !important;
        }

        .tool-call-error .tool-call-header {
          background-color: #fcf0f1;
        }

        .tool-call-default {
          border-left: 3px solid #8c8f94 !important;
        }

        .tool-call-default .tool-call-header {
          background-color: #f6f7f7;
        }

        .tool-call-header:hover {
          filter: brightness(0.98);
        }

        .tool-call-header:active {
          filter: brightness(0.96);
        }
      `}</style>
		</div>
	);
}
