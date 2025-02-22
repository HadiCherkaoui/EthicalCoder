/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 EthicalCoder. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IComposerService } from '../../../../platform/composer/common/composerService.js';
import { ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { localize } from '../../../../nls.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { registerWorkbenchContribution2, IWorkbenchContribution } from '../../../common/contributions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorExtensions, IEditorFactoryRegistry } from '../../../common/editor.js';
import { ComposerEditorInput } from './composerEditorInput.js';
import { KeyMod, KeyCode } from '../../../../base/common/keyCodes.js';
import { KeybindingWeight } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { Extensions as ConfigurationExtensions, IConfigurationRegistry, ConfigurationScope } from '../../../../platform/configuration/common/configurationRegistry.js';
import { ComposerWorkbenchService } from './composerWorkbenchService.js';

// Register service with exact decorator name and eager instantiation
registerSingleton(IComposerService, ComposerWorkbenchService, InstantiationType.Eager);

class OpenComposerComposerAction extends Action2 {
	constructor() {
		super({
			id: 'workbench.action.composer.openComposer',
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
		const ComposerService = accessor.get(IComposerService);
		await ComposerService.openComposer();
	}
}

registerAction2(OpenComposerComposerAction);

// Register as workbench contribution
class ComposerContribution implements IWorkbenchContribution {
	static readonly ID = 'workbench.contrib.composer';

	constructor(
	) { }
}

registerWorkbenchContribution2(ComposerContribution.ID, ComposerContribution, {
	lazy: true
});

// Register webview editor
Registry.as<IEditorFactoryRegistry>(EditorExtensions.EditorFactory)
	.registerEditorSerializer(
		'Composer.chat',
		ComposerEditorInput
	);

Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration)
	.registerConfiguration({
		id: 'Composer',
		title: 'Composer',
		type: 'object',
		properties: {
			'composer.baseurl': {
				type: 'string',
				default: 'http://localhost:3000/api',
				description: 'Base URL for the Composer interface, can be any OpenAI compatible endpoint',
				scope: ConfigurationScope.APPLICATION,
				pattern: '^https?://.*',
				patternErrorMessage: 'Must be a valid HTTP/HTTPS URL'
			},
			'composer.apiKey': {
				type: 'string',
				default: '',
				description: 'API key for authenticating with OpenAI compatible API',
				scope: ConfigurationScope.APPLICATION
			}
		}
	});
