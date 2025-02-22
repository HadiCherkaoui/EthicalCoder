/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 EthicalCoder. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IComposerService, ComposerOptions } from '../common/composerService.js';

export class ComposerDesktopService implements IComposerService {
	readonly _serviceBrand: undefined;

	constructor() { }

	async openChat(options?: ComposerOptions): Promise<void> {
		// Delegate to workbench service
	}

	async openComposer(): Promise<void> {
		// Desktop implementation
		return;
	}
}
