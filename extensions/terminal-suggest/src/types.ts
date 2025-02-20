/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 EthicalCoder. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

export interface ICompletionResource {
	label: string | vscode.CompletionItemLabel;
	/**
	 * The definition command of the completion, this will be the resolved value of an alias
	 * completion.
	 */
	definitionCommand?: string;
	documentation?: string | vscode.MarkdownString;
	detail?: string;
	kind?: vscode.TerminalCompletionItemKind;
}
