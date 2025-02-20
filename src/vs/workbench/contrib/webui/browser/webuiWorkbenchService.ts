/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 EthicalCoder. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IWebUIService } from '../../../../platform/webui/common/webuiService.js';
import { IWebviewWorkbenchService, WebviewInput } from '../../webviewPanel/browser/webviewWorkbenchService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { URI } from '../../../../base/common/uri.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { join } from '../../../../base/common/path.js';
import { Emitter } from '../../../../base/common/event.js';
import { WebviewMessageReceivedEvent } from '../../webview/browser/webview.js';
import { IDisposable } from '../../../../base/common/lifecycle.js';

interface ChatSession {
	id: string;
	title: string;
	messages: { role: string; content: string }[];
}

interface ChatSessionSummary {
	id: string;
	title: string;
}

interface SessionIndex {
	sessions: ChatSessionSummary[];
	currentSessionId: string;
}

interface WebviewMessage {
	type: string;
	content: { role: string; content: string };
}

export class WebUIWorkbenchService implements IWebUIService {
	readonly _serviceBrand: undefined;
	private sessionsDirectoryUri: URI;
	private sessionsIndexFile: URI;
	private chatSessions: ChatSession[] = [];
	private currentSessionId: string = '';
	private readonly _onDidChangeSession = new Emitter<{ id: string; messages: any[] }>();
	readonly onDidChangeSession = this._onDidChangeSession.event;
	private disposables = new Set<IDisposable>();
	private webviewInput: WebviewInput | undefined;

	constructor(
		@IWebviewWorkbenchService private readonly webviewWorkbenchService: IWebviewWorkbenchService,
		@ILogService private readonly logService: ILogService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IFileService private readonly fileService: IFileService,
		@IEnvironmentService private readonly environmentService: IEnvironmentService
	) {
		this.logService.info('[WebUI] Service constructed');
		const storagePath = this.environmentService.userRoamingDataHome;
		this.logService.info('[WebUI] Storage path:', storagePath);

		if (!storagePath) {
			throw new Error('[WebUI] No storage path available');
		}

		this.sessionsDirectoryUri = URI.file(join(storagePath.fsPath, 'chatSessions'));
		this.sessionsIndexFile = URI.file(join(storagePath.fsPath, 'chatSessions', 'chatSessionsIndex.json'));

		this.logService.info('[WebUI] Sessions directory:', this.sessionsDirectoryUri.fsPath);
		this.logService.info('[WebUI] Sessions index file:', this.sessionsIndexFile.fsPath);

		this.initializeSessions();
	}

	private async initializeSessions(): Promise<void> {
		await this.ensureSessionsDirectoryExists();
		await this.loadHistory();
	}

	private async ensureSessionsDirectoryExists(): Promise<void> {
		try {
			const exists = await this.fileService.exists(this.sessionsDirectoryUri);
			this.logService.info('[WebUI] Sessions directory exists:', exists);

			if (!exists) {
				await this.fileService.createFolder(this.sessionsDirectoryUri);
				this.logService.info('[WebUI] Created sessions directory:', this.sessionsDirectoryUri.fsPath);
			}
		} catch (e) {
			this.logService.error('[WebUI] Error ensuring sessions directory exists:', e);
			throw e;
		}
	}

	private async loadHistory(): Promise<void> {
		try {
			this.logService.info('[WebUI] Loading history from:', this.sessionsIndexFile.fsPath);
			await this.ensureSessionsDirectoryExists();

			const exists = await this.fileService.exists(this.sessionsIndexFile);
			if (!exists) {
				this.logService.info('[WebUI] No history file found, creating default session');
				await this.createDefaultSession();
				return;
			}

			const indexContent = await this.fileService.readFile(this.sessionsIndexFile);
			const indexData: SessionIndex = JSON.parse(indexContent.value.toString());
			this.logService.info('[WebUI] Loaded sessions index:', indexData);

			// Clear existing sessions before loading
			this.chatSessions = [];

			// Load sessions in order
			for (const summary of indexData.sessions) {
				const session: ChatSession = { id: summary.id, title: summary.title, messages: [] };
				await this.loadSession(session);
				this.chatSessions.push(session);
			}

			// Set current session to chat-1 if it exists, otherwise create it
			const chat1 = this.chatSessions.find(s => s.id === 'chat-1');
			if (chat1) {
				this.currentSessionId = chat1.id;
			} else {
				await this.createDefaultSession();
			}
		} catch (e) {
			this.logService.error('[WebUI] Failed to load history:', e);
			if (this.chatSessions.length === 0) {
				await this.createDefaultSession();
			}
		}
	}

	private async createDefaultSession(): Promise<void> {
		// Always create chat-1 if it doesn't exist
		const defaultSession: ChatSession = {
			id: 'chat-1',
			title: 'Chat 1',
			messages: []
		};

		this.chatSessions = [defaultSession];
		this.currentSessionId = defaultSession.id;

		try {
			await this.saveSession(defaultSession);
			await this.saveSessionsIndex();
			this.logService.info('[WebUI] Created new session:', defaultSession.id);
		} catch (e) {
			this.logService.error('[WebUI] Failed to save default session', e);
		}
	}

	private async loadSession(session: ChatSession): Promise<void> {
		try {
			const chatNumber = session.id.split('-')[1];
			const sessionFile = URI.file(join(this.sessionsDirectoryUri.fsPath, `chat-${chatNumber}.json`));

			this.logService.info('[WebUI] Loading session from:', sessionFile.fsPath);
			const content = await this.fileService.readFile(sessionFile);
			const sessionData = JSON.parse(content.value.toString());
			session.messages = sessionData.messages || [];
			this.logService.info('[WebUI] Loaded session with', session.messages.length, 'messages');
		} catch (e) {
			this.logService.error('[WebUI] Failed to load session', session.id, e);
			session.messages = [];
		}
	}

	private async saveSession(session: ChatSession): Promise<void> {
		const chatNumber = session.id.split('-')[1];
		const sessionFile = URI.file(join(this.sessionsDirectoryUri.fsPath, `chat-${chatNumber}.json`));
		try {
			this.logService.info('[WebUI] Saving session:', session.id, 'to', sessionFile.fsPath);
			await this.fileService.writeFile(
				sessionFile,
				VSBuffer.fromString(JSON.stringify({
					id: session.id,
					title: session.title,
					messages: session.messages
				}, null, 2))
			);
			await this.saveSessionsIndex();
			this.logService.info('[WebUI] Successfully saved session:', session.id);
		} catch (e) {
			this.logService.error('[WebUI] Failed to save session:', session.id, e);
			throw e;
		}
	}

	private async saveSessionsIndex(): Promise<void> {
		try {
			const indexData: SessionIndex = {
				sessions: this.chatSessions.map(s => ({ id: s.id, title: s.title })),
				currentSessionId: this.currentSessionId
			};
			await this.fileService.writeFile(
				this.sessionsIndexFile,
				VSBuffer.fromString(JSON.stringify(indexData, null, 2))
			);
			this.logService.info('[WebUI] Saved sessions index with current session:', this.currentSessionId);
		} catch (e) {
			this.logService.error('[WebUI] Failed to save sessions index:', e);
		}
	}

	private registerWebviewMessageListener(webview: WebviewInput): void {
		const disposable = webview.webview.onMessage(async (e: WebviewMessageReceivedEvent) => {
			const message = e.message as WebviewMessage;
			try {
				switch (message.type) {
					case 'chatMessage':
						await this.addMessage(message.content);
						break;
					case 'switchSession':
						await this.switchSession(message.content.content);
						break;
					case 'newSession':
						await this.createNewSession();
						break;
					default:
						this.logService.warn('[WebUI] Unknown message type:', message.type);
				}
			} catch (e) {
				this.logService.error('[WebUI] Error handling message:', e);
			}
		});

		this.disposables.add(disposable);
	}

	private async createNewSession(): Promise<void> {
		// Get next available number
		const existingNumbers = this.chatSessions
			.map(s => parseInt(s.id.split('-')[1]))
			.filter(n => !isNaN(n));
		const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;

		const newSession: ChatSession = {
			id: `chat-${nextNumber}`,
			title: `Chat ${nextNumber}`,
			messages: []
		};

		this.chatSessions.push(newSession);
		this.currentSessionId = newSession.id;

		try {
			await this.saveSession(newSession);
			await this.saveSessionsIndex();

			// Send both the new session and updated sessions list to the webview
			if (this.webviewInput?.webview) {
				this.webviewInput.webview.postMessage({
					type: 'updateSession',
					session: {
						id: newSession.id,
						messages: newSession.messages,
						title: newSession.title
					},
					allSessions: this.chatSessions.map(s => ({
						id: s.id,
						title: s.title
					}))
				});
			}

			this.logService.info('[WebUI] Created new session:', newSession.id);
		} catch (e) {
			this.logService.error('[WebUI] Failed to create new session', e);
		}
	}

	private async switchSession(sessionId: string): Promise<void> {
		const session = this.chatSessions.find(s => s.id === sessionId);
		if (!session) {
			this.logService.error('[WebUI] Failed to switch to session:', sessionId);
			return;
		}

		this.currentSessionId = sessionId;

		try {
			await this.saveSessionsIndex();

			// Send the event to the webview with type 'updateSession'
			if (this.webviewInput?.webview) {
				this.webviewInput.webview.postMessage({
					type: 'updateSession',
					session: {
						id: sessionId,
						messages: session.messages,
						title: session.title
					}
				});
			}

			this.logService.info('[WebUI] Switched to session:', sessionId);
		} catch (e) {
			this.logService.error('[WebUI] Error during session switch:', e);
		}
	}

	public async openComposer(): Promise<void> {
		try {
			const endpoint = this.configurationService.getValue<string>('webui.endpoint');
			const apiKey = this.configurationService.getValue<string>('webui.apiKey');
			if (!endpoint || !apiKey) {
				throw new Error('Missing endpoint or API key');
			}

			await this.loadHistory();

			const webviewInput = this.webviewWorkbenchService.openWebview(
				{
					title: 'AI Composer',
					options: { enableFindWidget: true },
					contentOptions: { allowScripts: true, localResourceRoots: [] },
					extension: undefined
				},
				'composerWebview',
				'AI Composer',
				{ preserveFocus: false }
			);

			this.registerWebviewMessageListener(webviewInput);

			// Store webview reference
			this.webviewInput = webviewInput;

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
						/* Sessions panel at the top */
						#sessionsPanel {
							display: flex;
							gap: 8px;
							overflow-x: auto;
							padding: 4px;
							border-bottom: 1px solid var(--vscode-editorWidget-border);
						}
						.session-button {
							padding: 6px 12px;
							background: var(--vscode-button-background);
							color: var(--vscode-button-foreground);
							border: none;
							border-radius: 4px;
							cursor: pointer;
							font-size: 13px;
						}
						.session-button.active {
							background: var(--vscode-button-hoverBackground);
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
						@keyframes messageAppear {
							from { opacity: 0; transform: translateY(10px); }
							to { opacity: 1; transform: translateY(0); }
						}
						/* Deepseek-inspired code block styles */
						.md-code-block {
							--ds-md-code-block-font-size: calc(var(--ds-md-zoom)*var(--ds-font-size-xsp));
							font-size: var(--ds-md-code-block-font-size);
							line-height: calc(var(--ds-md-code-block-font-size)*1.6);
							color: #fff;
							margin: 1em 0;
							border: 1px solid #444;
						}
						.md-code-block-banner {
							padding: calc(var(--ds-md-zoom)*8px) calc(var(--ds-md-zoom)*12px);
							color: #fff;
							font-size: var(--ds-md-code-block-font-size);
							line-height: var(--ds-md-code-block-font-size);
							border-top-left-radius: calc(var(--ds-md-zoom)*10px);
							border-top-right-radius: calc(var(--ds-md-zoom)*10px);
							background: #50505a;
							display: flex;
							justify-content: space-between;
							align-items: center;
						}
						.md-code-block-banner span {
							font-weight: bold;
						}
						.md-code-block-action {
							display: flex;
							align-items: center;
						}
						.ds-markdown-code-copy-button {
							background-color: rgba(0,0,0,0);
							color: inherit;
							cursor: pointer;
							border: none;
							margin: 0;
							padding: 0;
						}
	</style>
	<script>
						const vscode = acquireVsCodeApi();
						let sessions = ${JSON.stringify(this.chatSessions)};
						let currentSessionId = '${this.currentSessionId}';
						let currentSession = sessions.find(s => s.id === currentSessionId);

						function renderSessionsPanel() {
						const panel = document.getElementById('sessionsPanel');
						panel.innerHTML = '';
						sessions.forEach(session => {
						const button = document.createElement('button');
						button.textContent = session.title;
						button.className = 'session-button' + (session.id === currentSessionId ? ' active' : '');
						button.onclick = () => switchSession(session.id);
						panel.appendChild(button);
						});
						const newChatButton = document.createElement('button');
						newChatButton.className = 'session-button';
						newChatButton.textContent = '+ New Chat';
						newChatButton.onclick = () => vscode.postMessage({ type: 'newSession' });
						panel.appendChild(newChatButton);
						}

						function switchSession(sessionId) {
						vscode.postMessage({
						type: 'switchSession',
						content: { content: sessionId }
						});
						}

						function renameSession(sessionId) {
						const session = sessions.find(s => s.id === sessionId);
						const newTitle = prompt('Enter new chat title:', session.title);
						if (newTitle && newTitle !== session.title) {
						session.title = newTitle;
						vscode.postMessage({
						type: 'updateSessionTitle',
						id: sessionId,
						title: newTitle
						});
						renderSessionsPanel();
						}
						}

						function newSession() {
						const newId = 'chat-' + Date.now();
						const newChat = {
						id: newId,
						title: 'Chat ' + (sessions.length + 1),
						messages: []
						};
						sessions.push(newChat);
						switchSession(newId);
						vscode.postMessage({ type: 'newSession', content: newChat });
						}

						function displayMessages(messages) {
						const chatHistory = document.getElementById('chatHistory');
						chatHistory.innerHTML = ''; // Clear existing messages
						messages.forEach(msg => {
						addMessageToChat(msg.role, msg.content);
						});
						}

						async function fetchModels() {
						try {
						const response = await fetch('${endpoint}/api/models', {
						headers: { 'Authorization': 'Bearer ${apiKey}' }
						});
						if (!response.ok) {
						throw new Error('Failed to fetch models: ' + response.status);
						}
						const data = await response.json();
						const select = document.getElementById('modelSelect');
						select.innerHTML = data.data.map(model =>
						\`<option value="\${model.id}">\${model.name}</option>\`
						).join('');
						select.value = data.data[0]?.id || '';
						select.dispatchEvent(new Event('change'));
						} catch (error) {
						console.error('Error:', error);
						addMessageToChat('assistant', 'Error loading models: ' + error.message);
						}
						}

						// Configure marked to output code blocks with a header showing the language.
						marked.setOptions({
						highlight: function(code, language) {
						const validLang = language && hljs.getLanguage(language) ? language : 'plaintext';
						const highlighted = hljs.highlight(code, { language: validLang }).value;
						return \`
						<div class="md-code-block">
							<div class="md-code-block-banner">
								<span>\${validLang}</span>
								<div class="md-code-block-action">
									<button class="ds-markdown-code-copy-button" onclick="copyCode(this)">Copy</button>
								</div>
							</div>
							<pre><code class="hljs language-\${validLang}">\${highlighted}</code></pre>
						</div>
						\`;
						}
						});

						function copyCode(button) {
						const codeBlock = button.closest('.md-code-block').querySelector('code');
						navigator.clipboard.writeText(codeBlock.textContent);
						button.textContent = 'Copied!';
						setTimeout(() => (button.textContent = 'Copy'), 1500);
						}

						function addMessageToChat(role, content) {
						const chatHistoryElem = document.getElementById('chatHistory');
						const messageDiv = document.createElement('div');
						messageDiv.className = 'message ' + (role === 'user' ? 'user-message' : 'bot-message');
						if (role === 'assistant') {
						messageDiv.innerHTML = marked.parse(content);
						messageDiv.querySelectorAll('pre code').forEach(block => {
						hljs.highlightElement(block);
						});
						} else {
						messageDiv.textContent = content;
						}
						chatHistoryElem.appendChild(messageDiv);
						chatHistoryElem.scrollTop = chatHistoryElem.scrollHeight;
						return messageDiv;
						}

						async function sendMessage() {
						const messageInput = document.getElementById('messageInput');
						const message = messageInput.value.trim();
						if (!message) {
						return;
						}
						addMessageToChat('user', message);
						messageInput.value = '';
						try {
						const messageData = { role: 'user', content: message };
						currentSession.messages.push(messageData);
						vscode.postMessage({ type: 'chatMessage', content: messageData });
						const response = await fetch('${endpoint}/api/chat/completions', {
						method: 'POST',
						headers: {
							'Authorization': 'Bearer ${apiKey}',
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							model: document.getElementById('modelSelect').value,
							messages: currentSession.messages.concat({ role: 'user', content: message }),
							stream: true
						})
						});
						if (!response.ok) {
						throw new Error('Failed to send message');
						}
						const reader = response.body.getReader();
						const decoder = new TextDecoder();
						let botResponse = '';
						const messageDiv = addMessageToChat('assistant', '');
						while (true) {
						const { value, done } = await reader.read();
						if (done) {
							break;
						}
						const chunk = decoder.decode(value);
						const lines = chunk.split('\\n');
						for (const line of lines) {
							if (line.startsWith('data: ') && line !== 'data: [DONE]') {
								try {
									const data = JSON.parse(line.slice(6));
									if (data.choices[0]?.delta?.content) {
										botResponse += data.choices[0].delta.content;
										messageDiv.innerHTML = marked.parse(botResponse);
										messageDiv.querySelectorAll('pre code').forEach(block => {
											hljs.highlightElement(block);
										});
										document.getElementById('chatHistory').scrollTop =
											document.getElementById('chatHistory').scrollHeight;
									}
								} catch (e) {
									console.error('Error parsing chunk:', e);
								}
							}
						}
						}
						const assistantMessage = { role: 'assistant', content: botResponse };
						currentSession.messages.push(assistantMessage);
						vscode.postMessage({ type: 'chatMessage', content: assistantMessage });
						} catch (error) {
						console.error('Error:', error);
						addMessageToChat('assistant', 'Error: ' + error.message);
						}
						}

						window.addEventListener('load', () => {
						renderSessionsPanel();
						fetchModels();
						displayMessages(currentSession.messages);
						document.getElementById('messageInput').addEventListener('keydown', e => {
						if (e.key === 'Enter' && !e.shiftKey) {
						e.preventDefault();
						sendMessage();
						}
						});
						document.getElementById('modelSelect').addEventListener('change', function() {
						console.log('Selected model updated to:', this.value);
						});
						});

						window.addEventListener('message', event => {
						const message = event.data;
						switch (message.type) {
						case 'updateSession':
						currentSessionId = message.session.id;

						// Update sessions array if allSessions is provided
						if (message.allSessions) {
							sessions = message.allSessions;
						} else {
							// Update single session
							const idx = sessions.findIndex(s => s.id === message.session.id);
							if (idx !== -1) {
								sessions[idx] = message.session;
							}
						}

						currentSession = message.session;

						// Clear and update chat history
						const chatHistory = document.getElementById('chatHistory');
						chatHistory.innerHTML = '';
						message.session.messages.forEach(msg => {
							addMessageToChat(msg.role, msg.content);
						});

						// Update session buttons
						renderSessionsPanel();
						break;
						}
						});
										</script>
									</head>
									<body>
										<div id="sessionsPanel"></div>
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

	public async addMessage(message: { role: string; content: string }): Promise<void> {
		const currentSession = this.chatSessions.find(s => s.id === this.currentSessionId);
		if (!currentSession) {
			throw new Error('[WebUI] No current session found');
		}

		currentSession.messages.push(message);
		await this.saveSession(currentSession);
		await this.saveSessionsIndex();
		this.logService.info('[WebUI] Message added and saved to session:', this.currentSessionId);
	}

	dispose(): void {
		this.disposables.forEach(d => d.dispose());
		this.disposables.clear();
	}
}
