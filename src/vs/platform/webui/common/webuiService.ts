/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 EthicalCoder. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';

export interface WebUIOptions {
	readonly enableScripts?: boolean;
	readonly retainContextWhenHidden?: boolean;
}

export const IWebUIService = createDecorator<IWebUIService>('webUIService');

export interface IWebUIService {
	readonly _serviceBrand: undefined;
	/**
	 * Opens the composer in a webview panel within VS Code
	 */
	openComposer(): Promise<void>;
	// Add your service methods here
}
