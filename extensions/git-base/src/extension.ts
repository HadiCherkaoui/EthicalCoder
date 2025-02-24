/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 EthicalCoder. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ExtensionContext } from 'vscode';
import { registerAPICommands } from './api/api1';
import { GitBaseExtensionImpl } from './api/extension';
import { Model } from './model';

export function activate(context: ExtensionContext): GitBaseExtensionImpl {
	const apiImpl = new GitBaseExtensionImpl(new Model());
	context.subscriptions.push(registerAPICommands(apiImpl));

	return apiImpl;
}
