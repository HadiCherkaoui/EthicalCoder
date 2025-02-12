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
				margin: 0;
				padding: 12px;
				height: 100vh;
				display: flex;
				flex-direction: column;
				font-family: var(--vscode-font-family);
				background: var(--vscode-sideBar-background);
				color: var(--vscode-sideBar-foreground);
				gap: 12px;
			}

			#modelSelect {
				width: 100%;
				padding: 8px;
				background: var(--vscode-input-background);
				color: var(--vscode-input-foreground);
				border: 1px solid var(--vscode-input-border);
				border-radius: 4px;
				font-size: 13px;
			}

			#chatHistory {
				flex: 1;
				overflow-y: auto;
				padding: 8px;
				background: var(--vscode-editorWidget-background);
				border: 1px solid var(--vscode-editorWidget-border);
				border-radius: 6px;
				display: flex;
				flex-direction: column;
				gap: 8px;
			}

			.message {
				padding: 10px 14px;
				border-radius: 6px;
				max-width: 80%;
				line-height: 1.4;
				font-size: 13px;
				animation: messageAppear 0.2s ease-out;
			}

			.user-message {
				background: var(--vscode-input-background);
				border: 1px solid var(--vscode-input-border);
				align-self: flex-end;
				margin-left: 20%;
			}

			.bot-message {
				background: var(--vscode-editorWidget-background);
				border: 1px solid var(--vscode-editorWidget-border);
				align-self: flex-start;
				margin-right: 20%;
				color: var(--vscode-editor-foreground);
			}

			#input {
				display: flex;
				gap: 8px;
				padding: 8px 0;
				align-items: center;
			}

			#messageInput {
				flex: 1;
				min-height: 40px;
				padding: 8px;
				background: var(--vscode-input-background);
				color: var(--vscode-input-foreground);
				border: 1px solid var(--vscode-input-border);
				border-radius: 4px;
				resize: vertical;
				font-family: var(--vscode-font-family);
				font-size: 13px;
				line-height: 1.4;
			}

			button {
				padding: 6px 12px;
				background: var(--vscode-button-background);
				color: var(--vscode-button-foreground);
				border: none;
				border-radius: 4px;
				cursor: pointer;
				font-size: 13px;
				transition: background 0.2s ease;
			}

			button:hover {
				background: var(--vscode-button-hoverBackground);
			}

			.code-block {
				margin: 1em 0;
				border-radius: 6px;
				overflow: hidden;
			}

			.code-header {
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding: 6px 8px;
				background: var(--vscode-textCodeBlock-background);
				border-bottom: 1px solid var(--vscode-editor-border);
				font-size: 0.9em;
			}

			.code-header button {
				padding: 2px 6px;
				background: transparent;
				color: var(--vscode-button-secondaryForeground);
				border: 1px solid var(--vscode-button-secondaryBackground);
				font-size: 12px;
			}

			@keyframes messageAppear {
				from { opacity: 0; transform: translateY(10px); }
				to { opacity: 1; transform: translateY(0); }
			}
		</style>
		<script>
			const vscode = acquireVsCodeApi();
			let selectedModel = '';
			let conversationHistory = [];

			// Initialize event listeners
			window.addEventListener('load', () => {
				fetchModels();

				// Message input handler
				document.getElementById('messageInput').addEventListener('keydown', e => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
				});

				// Model selection handler
				document.getElementById('modelSelect').addEventListener('change', function() {
		selectedModel = this.value;
		console.log('Selected model updated to:', selectedModel);
				});
			});

			async function fetchModels() {
				try {
		const response = await fetch('${endpoint}/api/models', {
			headers: { 'Authorization': 'Bearer ${apiKey}' }
		});

		if (!response.ok) throw new Error('Failed to fetch models: ' + response.status);

		const data = await response.json();
		const select = document.getElementById('modelSelect');
		select.innerHTML = data.data.map(model =>
			\`<option value="\${model.id}">\${model.name}</option>\`
		).join('');

		// Set initial value and trigger change
		selectedModel = data.data[0]?.id || '';
		select.value = selectedModel;
		select.dispatchEvent(new Event('change'));
				} catch (error) {
		console.error('Error:', error);
		addMessageToChat('assistant', 'Error loading models: ' + error.message);
				}
			}

			marked.setOptions({
				highlight: function(code, language) {
		const validLang = language && hljs.getLanguage(language) ? language : 'plaintext';
		const highlighted = hljs.highlight(code, { language: validLang }).value;
		return \`
			<div class="code-block">
				<div class="code-header">
		<span>\${validLang}</span>
		<button onclick="copyCode(this)">Copy</button>
				</div>
				<pre><code class="hljs language-\${validLang}">\${highlighted}</code></pre>
			</div>
		\`;
				}
			});

			function copyCode(button) {
				const codeBlock = button.closest('.code-block').querySelector('code');
				navigator.clipboard.writeText(codeBlock.textContent);
				button.textContent = 'Copied!';
				setTimeout(() => button.textContent = 'Copy', 1500);
			}

			function addMessageToChat(role, content) {
				const chatHistory = document.getElementById('chatHistory');
				const messageDiv = document.createElement('div');
				messageDiv.className = \`message \${role === 'user' ? 'user-message' : 'bot-message markdown-body'}\`;

				if (role === 'assistant') {
		messageDiv.innerHTML = marked.parse(content);
		messageDiv.querySelectorAll('pre code').forEach(hljs.highlightBlock);
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
				messageDiv.querySelectorAll('pre code').forEach(hljs.highlightBlock);
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
		</script>
				</head>
				<body>
		<div id="models">
			<select id="modelSelect">
				<option value="">Loading models...</option>
			</select>
		</div>
		<div id="chatHistory"></div>
		<div id="input">
			<textarea id="messageInput" placeholder="Type message..." rows="2"></textarea>
			<button onclick="sendMessage()">Send</button>
		</div>
				</body>
			</html>
		`);
		} catch (error) {
			this.logService.error('[WebUI] Failed to open composer:', error);
			throw error;
		}
	}
}
