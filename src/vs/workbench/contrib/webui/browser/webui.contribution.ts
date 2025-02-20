/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 EthicalCoder. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IWebUIService } from '../../../../platform/webui/common/webuiService.js';
import { ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { localize } from '../../../../nls.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { WebUIWorkbenchService } from './webuiWorkbenchService.js';
import { registerWorkbenchContribution2, IWorkbenchContribution } from '../../../common/contributions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorExtensions, IEditorFactoryRegistry } from '../../../common/editor.js';
import { WebUIEditorInput } from './webuiEditorInput.js';
import { KeyMod, KeyCode } from '../../../../base/common/keyCodes.js';
import { KeybindingWeight } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { Extensions as ConfigurationExtensions, IConfigurationRegistry, ConfigurationScope } from '../../../../platform/configuration/common/configurationRegistry.js';

// Register service with exact decorator name and eager instantiation
registerSingleton(IWebUIService, WebUIWorkbenchService, InstantiationType.Eager);

class OpenWebUIComposerAction extends Action2 {
	constructor() {
		super({
			id: 'workbench.action.webui.openComposer',
			title: {
				value: localize('openAIComposer', "Open AI Composer"),
				original: 'Open AI Composer'
			},
			category: 'Developer',
			f1: true,
			keybinding: {
				primary: KeyMod.CtrlCmd | KeyCode.KeyI,
				weight: KeybindingWeight.WorkbenchContrib
			}
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const webUIService = accessor.get(IWebUIService);
		await webUIService.openComposer();
	}
}

registerAction2(OpenWebUIComposerAction);

// Register as workbench contribution
class WebUIContribution implements IWorkbenchContribution {
	static readonly ID = 'workbench.contrib.webui';

	constructor(
	) { }
}

registerWorkbenchContribution2(WebUIContribution.ID, WebUIContribution, {
	lazy: true
});

// Register webview editor
Registry.as<IEditorFactoryRegistry>(EditorExtensions.EditorFactory)
	.registerEditorSerializer(
		'webui.chat',
		WebUIEditorInput
	);

Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration)
	.registerConfiguration({
		id: 'webui',
		title: 'Open WebUI',
		type: 'object',
		properties: {
			'webui.endpoint': {
				type: 'string',
				default: 'http://localhost:3000',
				description: 'Endpoint URL for the Open WebUI interface',
				scope: ConfigurationScope.APPLICATION
			},
			'webui.apiKey': {
				type: 'string',
				default: '',
				description: 'API key for authenticating with Open WebUI. Can be found in Settings > Account.',
				scope: ConfigurationScope.APPLICATION
			}
		}
	});
