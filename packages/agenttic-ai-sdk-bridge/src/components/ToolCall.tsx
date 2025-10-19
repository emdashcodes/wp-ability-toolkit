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
import ReactMarkdown from 'react-markdown';
import { copyToClipboard } from '../utils/copyToClipboard.js';
import type { ToolCallContent } from '../types.js';

export interface ToolCallProps {
	toolCall: ToolCallContent;
}

export function ToolCall({ toolCall }: ToolCallProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [copiedInput, setCopiedInput] = useState(false);
	const [copiedOutput, setCopiedOutput] = useState(false);
	const [copiedInfo, setCopiedInfo] = useState(false);
	const [copiedThought, setCopiedThought] = useState(false);

	// Special rendering for think ability
	const isThinkAbility = toolCall.name === 'wp-ability-toolkit/think';

	if (isThinkAbility) {
		const thought =
			toolCall.output &&
			typeof toolCall.output === 'object' &&
			'thought' in toolCall.output
				? (toolCall.output as { thought: string }).thought
				: typeof toolCall.output === 'string'
					? toolCall.output
					: null;

		const isStreaming = toolCall.status === 'pending';
		const isComplete = toolCall.status === 'success';

		return (
			<div
				style={{
					marginTop: '2px',
					marginBottom: '4px',
					fontFamily:
						'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
				}}
			>
				{/* Trigger button */}
				<button
					onClick={() => setIsOpen(!isOpen)}
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: '8px',
						width: '100%',
						padding: '0',
						background: 'none',
						border: 'none',
						cursor: 'pointer',
						fontSize: '13px',
						color: '#757575',
						transition: 'color 0.15s ease',
						outline: 'none',
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.color = '#1e1e1e';
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.color = '#757575';
					}}
				>
					<span>
						{isStreaming
							? 'Thinking...'
							: isComplete
								? 'Thought for a moment'
								: 'Thinking...'}
					</span>
					<Icon
						icon={isOpen ? chevronUp : chevronDown}
						size={16}
						style={{
							transition: 'transform 0.2s ease',
							color: 'inherit',
						}}
					/>
				</button>

				{/* Collapsible content */}
				{isOpen && thought && (
					<div
						style={{
							marginTop: '6px',
							position: 'relative',
						}}
					>
						<div
							style={{
								padding: '12px 16px',
								backgroundColor: '#f6f7f7',
								borderLeft: '3px solid #8c8f94',
								borderRadius: '4px',
								fontSize: '13px',
								lineHeight: '1.6',
								color: '#50575e',
								animation: 'slideIn 0.2s ease',
							}}
						>
							<ReactMarkdown>{thought}</ReactMarkdown>
						</div>
						<Tooltip text={copiedThought ? 'Copied!' : 'Copy thought'}>
							<Button
								icon={copiedThought ? check : copySmall}
								size="small"
								variant="secondary"
								onClick={(e: React.MouseEvent) => {
									e.stopPropagation();
									copyToClipboard(thought, setCopiedThought);
								}}
								style={{
									position: 'absolute',
									top: '8px',
									right: '8px',
									minWidth: 'auto',
									height: '24px',
									padding: '0 8px',
								}}
							/>
						</Tooltip>
					</div>
				)}

				<style>{`
					@keyframes slideIn {
						from {
							opacity: 0;
							transform: translateY(-4px);
						}
						to {
							opacity: 1;
							transform: translateY(0);
						}
					}
				`}</style>
			</div>
		);
	}

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

	return (
		<div
			className={`tool-call-wrapper ${getStatusClass()}`}
			style={{
				marginTop: '2px',
				marginBottom: '2px',
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
					padding: '8px 12px',
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
						padding: '12px',
						borderTop: '1px solid #f0f0f1',
						overflow: 'hidden',
						minWidth: 0,
						width: '100%',
						maxWidth: '100%',
						boxSizing: 'border-box',
					}}
				>
					{/* Ability Info Box */}
					<div style={{ marginBottom: '12px', minWidth: 0 }}>
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
									icon={copiedInfo ? check : copySmall}
									size="small"
									variant="secondary"
									onClick={(e: React.MouseEvent) => {
										e.stopPropagation();
										const infoText = `${toolCall.name}\nID: ${toolCall.id}`;
										copyToClipboard(infoText, setCopiedInfo);
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
						<div style={{ marginBottom: '12px', minWidth: 0 }}>
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
										icon={copiedInput ? check : copySmall}
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
												setCopiedInput
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
						<div style={{ marginBottom: '12px', minWidth: 0 }}>
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
										icon={copiedOutput ? check : copySmall}
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
												setCopiedOutput
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
						<div style={{ marginBottom: '12px', minWidth: 0 }}>
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
