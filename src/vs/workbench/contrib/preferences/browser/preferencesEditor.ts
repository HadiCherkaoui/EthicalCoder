/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 EthicalCoder. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { ICodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { ConfigurationTarget } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IPreferencesRenderer, UserSettingsRenderer, WorkspaceSettingsRenderer } from './preferencesRenderers.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { SettingsEditorModel } from '../../../services/preferences/common/preferencesModels.js';

export class SettingsEditorContribution extends Disposable {
	static readonly ID: string = 'editor.contrib.settings';

	private currentRenderer: IPreferencesRenderer | undefined;
	private readonly disposables = this._register(new DisposableStore());

	constructor(
		private readonly editor: ICodeEditor,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IPreferencesService private readonly preferencesService: IPreferencesService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService
	) {
		super();
		this._createPreferencesRenderer();
		this._register(this.editor.onDidChangeModel(e => this._createPreferencesRenderer()));
		this._register(this.workspaceContextService.onDidChangeWorkbenchState(() => this._createPreferencesRenderer()));
	}

	private async _createPreferencesRenderer(): Promise<void> {
		this.disposables.clear();
		this.currentRenderer = undefined;

		const model = this.editor.getModel();
		if (model && /\.(json|code-workspace)$/.test(model.uri.path)) {
			// Fast check: the preferences renderer can only appear
			// in settings files or workspace files
			const settingsModel = await this.preferencesService.createPreferencesEditorModel(model.uri);
			if (settingsModel instanceof SettingsEditorModel && this.editor.getModel()) {
				this.disposables.add(settingsModel);
				switch (settingsModel.configurationTarget) {
					case ConfigurationTarget.WORKSPACE:
						this.currentRenderer = this.disposables.add(this.instantiationService.createInstance(WorkspaceSettingsRenderer, this.editor, settingsModel));
						break;
					default:
						this.currentRenderer = this.disposables.add(this.instantiationService.createInstance(UserSettingsRenderer, this.editor, settingsModel));
						break;
				}
			}

			this.currentRenderer?.render();
		}
	}
}
