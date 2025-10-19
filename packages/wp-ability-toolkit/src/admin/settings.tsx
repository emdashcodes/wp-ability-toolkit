/**
 * Settings page component
 */

import { render, useState, useEffect } from '@wordpress/element';
import {
	Panel,
	PanelBody,
	PanelRow,
	SelectControl,
	TextControl,
	Button,
	Notice,
	Spinner,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import '@wordpress/components/build-style/style.css';

interface Settings {
	provider: 'openai' | 'anthropic';
	apiKey: string;
	model: string;
}

declare global {
	interface Window {
		wpAbilityToolkitSettings?: {
			nonce: string;
			settingsEndpoint: string;
		};
	}
}

function SettingsPage() {
	const [settings, setSettings] = useState<Settings>({
		provider: 'openai',
		apiKey: '',
		model: 'gpt-5',
	});
	const [hasExistingKey, setHasExistingKey] = useState(false);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Load existing settings on mount
	useEffect(() => {
		const loadSettings = async () => {
			try {
				const response = await fetch(
					window.wpAbilityToolkitSettings?.settingsEndpoint || '',
					{
						method: 'GET',
						headers: {
							'X-WP-Nonce':
								window.wpAbilityToolkitSettings?.nonce || '',
						},
					}
				);

				if (!response.ok) {
					throw new Error('Failed to load settings');
				}

				const data = await response.json();
				setSettings({
					provider: data.provider || 'openai',
					apiKey: '', // Don't load API key for security
					model: data.model || 'gpt-5',
				});
				setHasExistingKey(data.hasApiKey || false);
			} catch (err) {
				console.error('Failed to load settings:', err);
			} finally {
				setLoading(false);
			}
		};

		loadSettings();
	}, []);

	const handleSave = async () => {
		setSaving(true);
		setError(null);
		setSaved(false);

		try {
			const response = await fetch(
				window.wpAbilityToolkitSettings?.settingsEndpoint || '',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'X-WP-Nonce':
							window.wpAbilityToolkitSettings?.nonce || '',
					},
					body: JSON.stringify({
						provider: settings.provider,
						apiKey: settings.apiKey,
						model: settings.model,
					}),
				}
			);

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to save settings');
			}

			setSaved(true);
			setHasExistingKey(true); // We just saved a key
			setTimeout(() => setSaved(false), 3000);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Failed to save settings'
			);
		} finally {
			setSaving(false);
		}
	};

	const modelOptions =
		settings.provider === 'openai'
			? [
					{ label: 'GPT-5', value: 'gpt-5' },
					{ label: 'GPT-4o', value: 'gpt-4o' },
				]
			: [
					{
						label: 'Claude Sonnet 4',
						value: 'claude-sonnet-4-20250514',
					},
					{
						label: 'Claude Sonnet 3.5',
						value: 'claude-3-5-sonnet-20241022',
					},
				];

	if (loading) {
		return (
			<div className="wrap">
				<h1>{__('WP Ability Tester Settings', 'wp-ability-tester')}</h1>
				<Spinner />
			</div>
		);
	}

	return (
		<div className="wrap">
			<h1>{__('WP Ability Tester Settings', 'wp-ability-tester')}</h1>

			{saved && (
				<Notice status="success" isDismissible={false}>
					{__('Settings saved successfully!', 'wp-ability-tester')}
				</Notice>
			)}

			{error && (
				<Notice status="error" isDismissible={false}>
					{error}
				</Notice>
			)}

			<Panel>
				<PanelBody
					title={__('AI Provider Configuration', 'wp-ability-tester')}
					initialOpen={true}
				>
					<PanelRow>
						<SelectControl
							label={__('Provider', 'wp-ability-tester')}
							value={settings.provider}
							options={[
								{ label: 'OpenAI', value: 'openai' },
								{ label: 'Anthropic', value: 'anthropic' },
							]}
							onChange={(provider) =>
								setSettings({
									...settings,
									provider: provider as
										| 'openai'
										| 'anthropic',
									model:
										provider === 'openai'
											? 'gpt-5'
											: 'claude-sonnet-4-20250514',
								})
							}
							help={__(
								'Select the AI provider to use for chat completions',
								'wp-ability-tester'
							)}
						/>
					</PanelRow>

					<PanelRow>
						<TextControl
							label={__('API Key', 'wp-ability-tester')}
							type="password"
							value={settings.apiKey}
							onChange={(apiKey) =>
								setSettings({ ...settings, apiKey })
							}
							placeholder={
								hasExistingKey ? '••••••••••••••••' : ''
							}
							help={
								hasExistingKey
									? __(
											'✓ API key configured. Enter a new key to replace it.',
											'wp-ability-tester'
										)
									: __(
											'Your API key will be encrypted before storage',
											'wp-ability-tester'
										)
							}
						/>
					</PanelRow>

					<PanelRow>
						<SelectControl
							label={__('Model', 'wp-ability-tester')}
							value={settings.model}
							options={modelOptions}
							onChange={(model) =>
								setSettings({ ...settings, model })
							}
							help={__(
								'Select the AI model to use for completions',
								'wp-ability-tester'
							)}
						/>
					</PanelRow>
				</PanelBody>

				<PanelBody
					title={__('Ability API Integration', 'wp-ability-tester')}
					initialOpen={false}
				>
					<Notice status="info" isDismissible={false}>
						{__(
							'WordPress Ability API integration coming soon. This will allow you to test abilities with the AI agent.',
							'wp-ability-tester'
						)}
					</Notice>
				</PanelBody>
			</Panel>

			<div style={{ marginTop: '20px' }}>
				<Button
					variant="primary"
					onClick={handleSave}
					isBusy={saving}
					disabled={saving || (!settings.apiKey && !hasExistingKey)}
				>
					{saving
						? __('Saving...', 'wp-ability-tester')
						: __('Save Settings', 'wp-ability-tester')}
				</Button>
			</div>
		</div>
	);
}

// Render the settings page
const root = document.getElementById('wp-ability-toolkit-settings-root');
if (root) {
	render(<SettingsPage />, root);
}
