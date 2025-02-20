/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 EthicalCoder. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IWebUIService } from '../../../../platform/webui/common/webuiService.js';
import { IWebviewWorkbenchService } from '../../webviewPanel/browser/webviewWorkbenchService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { URI } from '../../../../base/common/uri.js';
import { VSBuffer } from '../../../../base/common/buffer.js';

interface ChatMessage {
	type: string;
	content: { role: string; content: string };
}

interface ChatSession {
	id: string;
	title: string;
	messages: { role: string; content: string }[];
}

interface ChatSessionSummary {
	id: string;
	title: string;
}

export class WebUIWorkbenchService implements IWebUIService {
	readonly _serviceBrand: undefined;
	// Directory for individual session files and the index file.
	private sessionsDirectoryUri: URI;
	private sessionsIndexFile: URI;
	// In-memory sessions and active session id.
	private chatSessions: ChatSession[] = [];
	private currentSessionId: string = '';

	constructor(
		@IWebviewWorkbenchService private readonly webviewWorkbenchService: IWebviewWorkbenchService,
		@ILogService private readonly logService: ILogService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IFileService private readonly fileService: IFileService
	) {
		this.logService.info('[WebUI] Service constructed');
		const storagePath = this.configurationService.getValue<string>('appDataPath');
		// Create a dedicated folder for session files.
		this.sessionsDirectoryUri = URI.file(storagePath + '/chatSessions');
		// The index file tracks available sessions.
		this.sessionsIndexFile = URI.file(storagePath + '/chatSessionsIndex.json');
		// Start loading history asynchronously.
		this.loadHistory();
	}

	/**
	 * Ensure that the sessions directory exists.
	 */
	private async ensureSessionsDirectoryExists(): Promise<void> {
		try {
			// Some file systems may not allow reading a folder as a file.
			// If this fails, we try to create the folder.
			await this.fileService.readFile(this.sessionsDirectoryUri);
		} catch {
			try {
				await this.fileService.createFolder(this.sessionsDirectoryUri);
				this.logService.info('[WebUI] Created sessions directory:', this.sessionsDirectoryUri.fsPath);
			} catch (e) {
				this.logService.error('[WebUI] Failed to create sessions directory:', e);
			}
		}
	}
	private async loadHistory(): Promise<void> {
		await this.ensureSessionsDirectoryExists();
		try {
			const indexContent = await this.fileService.readFile(this.sessionsIndexFile);
			const summaries: ChatSessionSummary[] = JSON.parse(indexContent.value.toString());
			this.logService.info('[WebUI] Loaded sessions index:', summaries);
			for (const summary of summaries) {
				const session: ChatSession = { id: summary.id, title: summary.title, messages: [] };
				await this.loadSession(session);
				this.chatSessions.push(session);
			}
			if (this.chatSessions.length > 0) {
				this.currentSessionId = this.chatSessions[0].id;
			} else {
				this.createDefaultSession();
			}
		} catch (e) {
			this.logService.error('[WebUI] Failed to load sessions index, creating default session', e);
			this.createDefaultSession();
		}
	}
	private createDefaultSession(): void {
		const defaultSession: ChatSession = {
			id: 'chat-1',
			title: 'Chat 1',
			messages: []
		};
		this.chatSessions = [defaultSession];
		this.currentSessionId = defaultSession.id;
		this.saveSessionsIndex();
		this.saveSession(defaultSession);
		this.logService.info('[WebUI] Created default session:', defaultSession);
	}
	private async loadSession(session: ChatSession): Promise<void> {
		// Construct the session file path.
		const sessionFile = URI.file(
			this.sessionsDirectoryUri.fsPath + '/session_' + session.id + '.json'
		);
		try {
			const content = await this.fileService.readFile(sessionFile);
			session.messages = JSON.parse(content.value.toString());
			this.logService.info('[WebUI] Loaded session', session.id, session.messages);
		} catch (e) {
			this.logService.error('[WebUI] Failed to load session', session.id, e);
			session.messages = [];
		}
	}
	private async saveSession(session: ChatSession): Promise<void> {
		const sessionFile = URI.file(
			this.sessionsDirectoryUri.fsPath + '/session_' + session.id + '.json'
		);
		try {
			await this.fileService.writeFile(
				sessionFile,
				VSBuffer.fromString(JSON.stringify(session.messages))
			);
			this.logService.info('[WebUI] Saved session', session.id);
		} catch (e) {
			this.logService.error('[WebUI] Failed to save session', session.id, e);
		}
	}
	private async saveSessionsIndex(): Promise<void> {
		const summaries: ChatSessionSummary[] = this.chatSessions.map(s => ({
			id: s.id,
			title: s.title
		}));
		try {
			await this.fileService.writeFile(
				this.sessionsIndexFile,
				VSBuffer.fromString(JSON.stringify(summaries))
			);
			this.logService.info('[WebUI] Saved sessions index');
		} catch (e) {
			this.logService.error('[WebUI] Failed to save sessions index:', e);
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

			// Ensure that the chat sessions have been loaded.
			await this.loadHistory();

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

			// Pass the full sessions and current session id to the webview.
			const initialSessions = this.chatSessions;
			const currentSessionId = this.currentSessionId;

			// Handle messages from the webview.
			webviewInput.webview.onMessage(async (message: any) => {
				if (message.type === 'chatMessage') {
					const chatMessage = message as ChatMessage;
					const session = this.chatSessions.find(
						(s) => s.id === this.currentSessionId
					);
					if (session) {
						session.messages.push(chatMessage.content);
						await this.saveSession(session);
					}
				} else if (message.type === 'newSession') {
					const newSession: ChatSession = message.content;
					this.chatSessions.push(newSession);
					this.currentSessionId = newSession.id;
					await this.saveSessionsIndex();
					await this.saveSession(newSession);
				} else if (message.type === 'switchSession') {
					this.currentSessionId = message.content;
				}
			});

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
						// Get initial sessions and active session id from the extension.
						let sessions = ${JSON.stringify(initialSessions)};
						let currentSessionId = ${JSON.stringify(currentSessionId)};
						let currentSession = sessions.find(s => s.id === currentSessionId) || sessions[0];

						function renderSessionsPanel() {
							const panel = document.getElementById('sessionsPanel');
							panel.innerHTML = '';
							sessions.forEach(session => {
								const button = document.createElement('button');
								button.className = 'session-button' + (session.id === currentSession.id ? ' active' : '');
								button.textContent = session.title;
								button.onclick = () => switchSession(session.id);
								panel.appendChild(button);
							});
							// Button to create a new chat session.
							const newChatButton = document.createElement('button');
							newChatButton.className = 'session-button';
							newChatButton.textContent = '+ New Chat';
							newChatButton.onclick = newSession;
							panel.appendChild(newChatButton);
						}

						function switchSession(sessionId) {
							currentSession = sessions.find(s => s.id === sessionId);
							currentSessionId = sessionId;
							vscode.postMessage({ type: 'switchSession', content: sessionId });
							document.getElementById('chatHistory').innerHTML = '';
							displaySavedHistory();
							renderSessionsPanel();
						}

						function newSession() {
							const newId = 'chat-' + new Date().getTime();
							const newChat = { id: newId, title: 'New Chat', messages: [] };
							sessions.push(newChat);
							currentSession = newChat;
							currentSessionId = newId;
							vscode.postMessage({ type: 'newSession', content: newChat });
							document.getElementById('chatHistory').innerHTML = '';
							renderSessionsPanel();
						}

						function displaySavedHistory() {
							const chatHistoryElem = document.getElementById('chatHistory');
							(currentSession.messages || []).forEach(msg => {
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
							displaySavedHistory();
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
}
