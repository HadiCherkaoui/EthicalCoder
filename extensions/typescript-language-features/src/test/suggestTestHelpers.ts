/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 EthicalCoder. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'mocha';
import * as vscode from 'vscode';
import { onChangedDocument, retryUntilDocumentChanges, wait } from './testUtils';

export async function acceptFirstSuggestion(uri: vscode.Uri, _disposables: vscode.Disposable[]) {
	return retryUntilDocumentChanges(uri, { retries: 10, timeout: 0 }, _disposables, async () => {
		await vscode.commands.executeCommand('editor.action.triggerSuggest');
		await wait(1000);
		await vscode.commands.executeCommand('acceptSelectedSuggestion');
	});
}

export async function typeCommitCharacter(uri: vscode.Uri, character: string, _disposables: vscode.Disposable[]) {
	const didChangeDocument = onChangedDocument(uri, _disposables);
	await vscode.commands.executeCommand('editor.action.triggerSuggest');
	await wait(3000); // Give time for suggestions to show
	await vscode.commands.executeCommand('type', { text: character });
	return await didChangeDocument;
}
