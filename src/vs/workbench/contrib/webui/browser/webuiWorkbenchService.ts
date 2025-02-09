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

			if (!endpoint || !apiKey) {
				throw new Error('Missing endpoint or API key configuration');
			}

			const webviewInput = this.webviewWorkbenchService.openWebview(
				{
					title: 'AI Composer',
					options: { enableFindWidget: true },
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
							select, textarea, button {
								width: 100%;
								padding: 8px;
								margin-bottom: 10px;
								background: var(--vscode-input-background);
								color: var(--vscode-input-foreground);
								border: 1px solid var(--vscode-input-border);
								border-radius: 2px;
							}
							button {
								background: var(--vscode-button-background);
								color: var(--vscode-button-foreground);
								cursor: pointer;
							}
							button:hover {
								background: var(--vscode-button-hoverBackground);
							}
							#chatHistory {
								margin: 20px 0;
								padding: 10px;
								height: 400px;
								overflow-y: auto;
								border: 1px solid var(--vscode-input-border);
								background: var(--vscode-input-background);
							}
							.message {
								margin: 10px 0;
								padding: 10px;
								border-radius: 4px;
							}
							.user-message {
								background: var(--vscode-textBlockQuote-background);
								margin-left: 20px;
							}
							.bot-message {
								background: var(--vscode-editor-inactiveSelectionBackground);
								margin-right: 20px;
							}
						</style>
						<script>
							const vscode = acquireVsCodeApi();
							let selectedModel = '';
							let conversationHistory = []; // Store conversation history

							async function fetchModels() {
								try {
									const response = await fetch('${endpoint}/api/models', {
										headers: {
											'Authorization': 'Bearer ${apiKey}'
										}
									});

									if (!response.ok) {
										throw new Error('Failed to fetch models: ' + response.status);
									}

									const data = await response.json();
									const models = data.data || [];

									const select = document.getElementById('modelSelect');
									select.innerHTML = '';

									if (models.length === 0) {
										select.innerHTML = '<option value="">No models available</option>';
										return;
									}

									models.forEach(model => {
										const option = document.createElement('option');
										option.value = model.id;
										option.textContent = model.name;
										select.appendChild(option);
									});

									selectedModel = models[0].id;
								} catch (error) {
									console.error('Error:', error);
									document.getElementById('status').textContent = error.message;
								}
							}

							async function sendMessage() {
								const messageInput = document.getElementById('messageInput');
								const message = messageInput.value.trim();

								if (!message) return;

								// Add user message to history and chat
								const userMessage = { role: 'user', content: message };
								conversationHistory.push(userMessage);
								addMessageToChat('user', message);
								messageInput.value = '';

								try {
									const response = await fetch('${endpoint}/api/chat/completions', {
										method: 'POST',
										headers: {
											'Authorization': 'Bearer ${apiKey}',
											'Content-Type': 'application/json'
										},
										body: JSON.stringify({
											model: selectedModel,
											messages: conversationHistory, // Send full conversation history
											stream: true
										})
									});

									if (!response.ok) {
										throw new Error('Failed to send message');
									}

									// Create a new message div for the bot response
									const chatHistory = document.getElementById('chatHistory');
									const messageDiv = document.createElement('div');
									messageDiv.className = 'message bot-message';
									chatHistory.appendChild(messageDiv);

									const reader = response.body.getReader();
									const decoder = new TextDecoder();
									let botResponse = '';

									while (true) {
										const { value, done } = await reader.read();
										if (done) break;

										const chunk = decoder.decode(value);
										const lines = chunk.split('\\n');

										for (const line of lines) {
											if (line.startsWith('data: ') && line !== 'data: [DONE]') {
												try {
													const data = JSON.parse(line.slice(6));
													if (data.choices[0]?.delta?.content) {
														botResponse += data.choices[0].delta.content;
														messageDiv.textContent = botResponse;
														chatHistory.scrollTop = chatHistory.scrollHeight;
													}
												} catch (e) {
													console.error('Error parsing chunk:', e);
												}
											}
										}
									}

									// Add assistant's response to conversation history
									conversationHistory.push({ role: 'assistant', content: botResponse });

								} catch (error) {
									console.error('Error:', error);
									document.getElementById('status').textContent = error.message;
								}
							}

							function addMessageToChat(role, content) {
								const chatHistory = document.getElementById('chatHistory');
								const messageDiv = document.createElement('div');
								messageDiv.className = 'message ' + (role === 'user' ? 'user-message' : 'bot-message');
								messageDiv.textContent = content;
								chatHistory.appendChild(messageDiv);
								chatHistory.scrollTop = chatHistory.scrollHeight;
							}

							window.addEventListener('load', fetchModels);
						</script>
					</head>
					<body>
						<div id="models">
							<h3>Select Model</h3>
							<select id="modelSelect" onchange="selectedModel = this.value">
								<option value="">Loading models...</option>
							</select>
						</div>
						<div id="chatHistory"></div>
						<div id="input">
							<textarea id="messageInput"
								placeholder="Type your message here..."
								rows="3"
								onkeydown="if(event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(); }">
							</textarea>
							<button onclick="sendMessage()">Send</button>
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
