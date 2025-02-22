/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 EthicalCoder. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from '../../instantiation/common/instantiation.js';

export interface ComposerOptions {
	readonly enableScripts?: boolean;
	readonly retainContextWhenHidden?: boolean;
}

export const IComposerService = createDecorator<IComposerService>('ComposerService');

export interface IComposerService {
	readonly _serviceBrand: undefined;
	/**
	 * Opens the Composer in a webview panel within VS Code
	 */
	openComposer(): Promise<void>;
	// Add your service methods here
}
