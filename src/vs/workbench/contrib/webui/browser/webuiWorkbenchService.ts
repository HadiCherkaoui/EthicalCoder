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
							script-src 'unsafe-inline' https://cdnjs.cloudflare.com;
							connect-src ${endpoint};
							style-src 'unsafe-inline' https://cdnjs.cloudflare.com;
							font-src https://cdnjs.cloudflare.com;">
						<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/vs2015.min.css">
						<script src="https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.0/marked.min.js"></script>
						<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
						<style>
							body {
								padding: 20px;
								font-family: var(--monaco-monospace-font);
								background: var(--vscode-editor-background);
								color: var(--vscode-editor-foreground);
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
								white-space: pre-wrap;
							}
							.user-message {
								background: var(--vscode-textBlockQuote-background);
								margin-left: 20px;
							}
							.bot-message {
								background: var(--vscode-editor-inactiveSelectionBackground);
								margin-right: 20px;
							}
							textarea {
								width: 100%;
								padding: 8px;
								margin: 10px 0;
								background: var(--vscode-input-background);
								color: var(--vscode-input-foreground);
								border: 1px solid var(--vscode-input-border);
								resize: vertical;
							}
							button {
								background: var(--vscode-button-background);
								color: var(--vscode-button-foreground);
								border: none;
								padding: 8px 16px;
								cursor: pointer;
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
							.markdown-body {
								color: var(--vscode-editor-foreground);
								font-family: var(--monaco-monospace-font);
								line-height: 1.6;
							}
							.markdown-body pre {
								background: var(--vscode-textBlockQuote-background);
								padding: 16px;
								border-radius: 4px;
								overflow: auto;
							}
							.markdown-body code {
								font-family: var(--monaco-monospace-font);
								background: var(--vscode-textBlockQuote-background);
								padding: 0.2em 0.4em;
								border-radius: 3px;
							}
						</style>
						<script>
							const vscode = acquireVsCodeApi();
							let selectedModel = '';
							let conversationHistory = [];

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
									addMessageToChat('assistant', 'Error loading models: ' + error.message);
								}
							}

							// Configure marked
							marked.setOptions({
								highlight: function(code, lang) {
									return hljs.highlightAuto(code).value;
								},
								langPrefix: 'hljs language-'
							});

							function addMessageToChat(role, content) {
								const chatHistory = document.getElementById('chatHistory');
								const messageDiv = document.createElement('div');
								messageDiv.className = 'message ' + (role === 'user' ? 'user-message' : 'bot-message markdown-body');

								if (role === 'assistant') {
									messageDiv.innerHTML = marked.parse(content);
									// Highlight code blocks
									messageDiv.querySelectorAll('pre code').forEach((block) => {
										hljs.highlightBlock(block);
									});
								} else {
									messageDiv.textContent = content;
								}

								chatHistory.appendChild(messageDiv);
								chatHistory.scrollTop = chatHistory.scrollHeight;
								return messageDiv;
							}

							async function sendMessage() {
								const messageInput = document.getElementById('messageInput');
								const message = messageInput.value.trim();

								if (!message) return;

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
											messages: [...conversationHistory, { role: 'user', content: message }],
											stream: true
										})
									});

									if (!response.ok) throw new Error('Failed to send message');

									const reader = response.body.getReader();
									const decoder = new TextDecoder();
									let botResponse = '';
									const messageDiv = addMessageToChat('assistant', '');

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
														messageDiv.innerHTML = marked.parse(botResponse);
														messageDiv.querySelectorAll('pre code').forEach((block) => {
															hljs.highlightBlock(block);
														});
														chatHistory.scrollTop = chatHistory.scrollHeight;
													}
												} catch (e) {
													console.error('Error parsing chunk:', e);
												}
											}
										}
									}

									conversationHistory.push(
										{ role: 'user', content: message },
										{ role: 'assistant', content: botResponse }
									);

								} catch (error) {
									console.error('Error:', error);
									addMessageToChat('assistant', 'Error: ' + error.message);
								}
							}

							window.addEventListener('load', fetchModels);
						</script>
					</head>
					<body>
						<div id="models">
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
					</body>
				</html>`);
		} catch (error) {
			this.logService.error('[WebUI] Failed to open composer:', error);
			throw error;
		}
	}
}
