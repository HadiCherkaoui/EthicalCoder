/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 EthicalCoder. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from '../../../base/common/uri.js';
import { IOpenerService } from '../../opener/common/opener.js';
import { IWebUIService } from '../common/webuiService.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';

export class WebUIService implements IWebUIService {
	readonly _serviceBrand: undefined;

	constructor(
		@IOpenerService private readonly openerService: IOpenerService,
		@IConfigurationService private readonly configurationService: IConfigurationService
	) { }

	async openChat(): Promise<void> {
		const endpoint = this.configurationService.getValue<string>('webui.endpoint') || 'http://localhost:3000';
		await this.openerService.open(URI.parse(endpoint));
	}

	async openComposer(): Promise<void> {
		// Browser implementation
		return;
	}
}
