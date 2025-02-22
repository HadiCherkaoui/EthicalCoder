/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 EthicalCoder. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { INativeHostService } from '../../native/common/native.js';
import { IComposerService } from '../common/composerService.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';

export class ComposerMainService implements IComposerService {
	declare readonly _serviceBrand: undefined;

	constructor(
		@INativeHostService private readonly nativeHostService: INativeHostService,
		@IConfigurationService private readonly configurationService: IConfigurationService
	) { }

	async openChat(): Promise<void> {
		const endpoint = this.configurationService.getValue<string>('composer.baseurl') || 'http://localhost:3000/api';
		await this.nativeHostService.openExternal(endpoint);
	}

	async openComposer(): Promise<void> {
		// Node implementation
		return;
	}
}
