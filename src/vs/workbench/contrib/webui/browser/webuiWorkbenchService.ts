/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 EthicalCoder. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IWebUIService } from '../../../../platform/webui/common/webuiService.js';
import { IWebviewWorkbenchService } from '../../webviewPanel/browser/webviewWorkbenchService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';

export class WebUIWorkbenchService implements IWebUIService {
	readonly _serviceBrand: undefined;

	constructor(
		@IWebviewWorkbenchService private readonly webviewWorkbenchService: IWebviewWorkbenchService,
		@ILogService private readonly logService: ILogService,
		@IConfigurationService private readonly configurationService: IConfigurationService
	) {
		this.logService.info('[WebUI] Service constructed');
	}

	async openChat(): Promise<void> {
		this.logService.info('[WebUI] openChat called');
		const endpoint = this.configurationService.getValue<string>('webui.endpoint');
		if (!endpoint) {
			this.logService.error('[WebUI] No endpoint configured. Please set webui.endpoint in settings.');
			throw new Error('No endpoint configured. Please set webui.endpoint in settings.');
		}
		try {
			const webviewInput = this.webviewWorkbenchService.openWebview(
				{
					title: 'AI Chat',
					options: {
						enableFindWidget: true
					},
					contentOptions: {
						allowScripts: true,
						localResourceRoots: []
					},
					extension: undefined
				},
				'chatWebview',
				'AI Chat',
				{ preserveFocus: false }
			);

			await webviewInput.webview.setHtml(`<!DOCTYPE html>
				<html>
					<head>
						<meta charset="UTF-8">
						<meta http-equiv="Content-Security-Policy" content="
							default-src 'none';
							frame-src ${endpoint};
							style-src 'unsafe-inline';">
						<style>
							body, html {
								margin: 0;
								padding: 0;
								height: 100vh;
								overflow: hidden;
							}
							iframe {
								width: 100%;
								height: 100vh;
								border: none;
								display: block;
							}
						</style>
					</head>
					<body>
						<iframe src="${endpoint}" sandbox="allow-scripts allow-forms allow-popups allow-same-origin"></iframe>
					</body>
				</html>`);
		} catch (error) {
			this.logService.error('[WebUI] Failed to open chat:', error);
			throw error;
		}
	}

	async openComposer(): Promise<void> {
		this.logService.info('[WebUI] openComposer called');
		try {
			const endpoint = this.configurationService.getValue<string>('webui.endpoint');
			const apiKey = this.configurationService.getValue<string>('webui.apiKey');

			if (!endpoint) {
				this.logService.error('[WebUI] No endpoint configured. Please set webui.endpoint in settings.');
				throw new Error('No endpoint configured. Please set webui.endpoint in settings.');
			}

			if (!apiKey) {
				this.logService.error('[WebUI] No API key configured. Please set webui.apiKey in settings.');
				throw new Error('No API key configured. Please set webui.apiKey in settings.');
			}

			const webviewInput = this.webviewWorkbenchService.openWebview(
				{
					title: 'AI Composer',
					options: {
						enableFindWidget: true
					},
					contentOptions: {
						allowScripts: true,
						localResourceRoots: []
					},
					extension: undefined
				},
				'composerWebview',
				'AI Composer',
				{ preserveFocus: false }
			);

			await webviewInput.webview.setHtml(`
				<html>
					<head>
						<meta charset="UTF-8">
						<meta http-equiv="Content-Security-Policy" content="
							default-src 'none';
							script-src 'unsafe-inline';
							connect-src ${endpoint};
							style-src 'unsafe-inline';">
						<style>
							body {
								padding: 20px;
								font-family: var(--monaco-monospace-font);
								background: var(--vscode-editor-background);
								color: var(--vscode-editor-foreground);
							}
							#models {
								margin-bottom: 20px;
							}
							select {
								width: 100%;
								padding: 8px;
								margin-bottom: 10px;
								background: var(--vscode-input-background);
								color: var(--vscode-input-foreground);
								border: 1px solid var(--vscode-input-border);
							}
							#status {
								margin-top: 10px;
								color: var(--vscode-errorForeground);
							}
						</style>
						<script>
							const vscode = acquireVsCodeApi();

							async function fetchModels() {
								try {
									console.log('Fetching from:', '${endpoint}/api/models');
									console.log('Using API key:', '${apiKey}');

									const response = await fetch('${endpoint}/api/models', {
										headers: {
											'Authorization': 'Bearer ${apiKey}'
										}
									});
									console.log('Response status:', response.status);

									if (!response.ok) {
										const errorText = await response.text();
										console.error('Response error:', errorText);
										throw new Error('Failed to fetch models: ' + response.status + ' ' + errorText);
									}

									const data = await response.json();
									console.log('Full API Response:', data);

									// Extract models from the data array
									const models = data.data || [];
									console.log('Processed models:', models);

									const select = document.getElementById('modelSelect');
									select.innerHTML = ''; // Clear loading option

									if (models.length === 0) {
										const option = document.createElement('option');
										option.value = "";
										option.textContent = "No models available";
										select.appendChild(option);
										return;
									}

									models.forEach(model => {
										console.log('Processing model:', model);
										const option = document.createElement('option');
										option.value = model.id;
										option.textContent = model.name;
										select.appendChild(option);
									});
								} catch (error) {
									console.error('Detailed fetch error:', error);
									document.getElementById('status').textContent = 'Error loading models: ' + error.message;
								}
							}

							window.addEventListener('load', fetchModels);
						</script>
					</head>
					<body>
						<div id="models">
							<h3>Available Models</h3>
							<select id="modelSelect">
								<option value="">Loading models...</option>
							</select>
						</div>
						<div id="status"></div>
					</body>
				</html>
			`);
		} catch (error) {
			this.logService.error('[WebUI] Failed to open composer:', error);
			throw error;
		}
	}
}
