/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 EthicalCoder. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { INativeHostService } from '../../..//platform/native/common/native.js';
import { IWebUIService } from '../../../platform/webui/common/webuiService.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';

export class WebUIMainService implements IWebUIService {
	declare readonly _serviceBrand: undefined;

	constructor(
		@INativeHostService private readonly nativeHostService: INativeHostService,
		@IConfigurationService private readonly configurationService: IConfigurationService
	) { }

	async openChat(): Promise<void> {
		const endpoint = this.configurationService.getValue<string>('webui.endpoint') || 'http://localhost:3000';
		await this.nativeHostService.openExternal(endpoint);
	}

	async openComposer(): Promise<void> {
		// Node implementation
		return;
	}
}
