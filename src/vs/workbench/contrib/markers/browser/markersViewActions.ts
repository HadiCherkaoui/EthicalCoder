/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 EthicalCoder. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as DOM from '../../../../base/browser/dom.js';
import { Action, IAction } from '../../../../base/common/actions.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import Messages from './messages.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Marker } from './markersModel.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { ActionViewItem, IActionViewItemOptions } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { MarkersContextKeys } from '../common/markers.js';
import './markersViewActions.css';

export interface IMarkersFiltersChangeEvent {
	excludedFiles?: boolean;
	showWarnings?: boolean;
	showErrors?: boolean;
	showInfos?: boolean;
	activeFile?: boolean;
}

export interface IMarkersFiltersOptions {
	filterHistory: string[];
	showErrors: boolean;
	showWarnings: boolean;
	showInfos: boolean;
	excludedFiles: boolean;
	activeFile: boolean;
}

export class MarkersFilters extends Disposable {

	private readonly _onDidChange: Emitter<IMarkersFiltersChangeEvent> = this._register(new Emitter<IMarkersFiltersChangeEvent>());
	readonly onDidChange: Event<IMarkersFiltersChangeEvent> = this._onDidChange.event;

	constructor(options: IMarkersFiltersOptions, private readonly contextKeyService: IContextKeyService) {
		super();

		this._showErrors.set(options.showErrors);
		this._showWarnings.set(options.showWarnings);
		this._showInfos.set(options.showInfos);
		this._excludedFiles.set(options.excludedFiles);
		this._activeFile.set(options.activeFile);
		this.filterHistory = options.filterHistory;
	}

	filterHistory: string[];

	private readonly _excludedFiles = MarkersContextKeys.ShowExcludedFilesFilterContextKey.bindTo(this.contextKeyService);
	get excludedFiles(): boolean {
		return !!this._excludedFiles.get();
	}
	set excludedFiles(filesExclude: boolean) {
		if (this._excludedFiles.get() !== filesExclude) {
			this._excludedFiles.set(filesExclude);
			this._onDidChange.fire({ excludedFiles: true });
		}
	}

	private readonly _activeFile = MarkersContextKeys.ShowActiveFileFilterContextKey.bindTo(this.contextKeyService);
	get activeFile(): boolean {
		return !!this._activeFile.get();
	}
	set activeFile(activeFile: boolean) {
		if (this._activeFile.get() !== activeFile) {
			this._activeFile.set(activeFile);
			this._onDidChange.fire({ activeFile: true });
		}
	}

	private readonly _showWarnings = MarkersContextKeys.ShowWarningsFilterContextKey.bindTo(this.contextKeyService);
	get showWarnings(): boolean {
		return !!this._showWarnings.get();
	}
	set showWarnings(showWarnings: boolean) {
		if (this._showWarnings.get() !== showWarnings) {
			this._showWarnings.set(showWarnings);
			this._onDidChange.fire({ showWarnings: true });
		}
	}

	private readonly _showErrors = MarkersContextKeys.ShowErrorsFilterContextKey.bindTo(this.contextKeyService);
	get showErrors(): boolean {
		return !!this._showErrors.get();
	}
	set showErrors(showErrors: boolean) {
		if (this._showErrors.get() !== showErrors) {
			this._showErrors.set(showErrors);
			this._onDidChange.fire({ showErrors: true });
		}
	}

	private readonly _showInfos = MarkersContextKeys.ShowInfoFilterContextKey.bindTo(this.contextKeyService);
	get showInfos(): boolean {
		return !!this._showInfos.get();
	}
	set showInfos(showInfos: boolean) {
		if (this._showInfos.get() !== showInfos) {
			this._showInfos.set(showInfos);
			this._onDidChange.fire({ showInfos: true });
		}
	}

}

export class QuickFixAction extends Action {

	public static readonly ID: string = 'workbench.actions.problems.quickfix';
	private static readonly CLASS: string = 'markers-panel-action-quickfix ' + ThemeIcon.asClassName(Codicon.lightBulb);
	private static readonly AUTO_FIX_CLASS: string = QuickFixAction.CLASS + ' autofixable';

	private readonly _onShowQuickFixes = this._register(new Emitter<void>());
	readonly onShowQuickFixes: Event<void> = this._onShowQuickFixes.event;

	private _quickFixes: IAction[] = [];
	get quickFixes(): IAction[] {
		return this._quickFixes;
	}
	set quickFixes(quickFixes: IAction[]) {
		this._quickFixes = quickFixes;
		this.enabled = this._quickFixes.length > 0;
	}

	autoFixable(autofixable: boolean) {
		this.class = autofixable ? QuickFixAction.AUTO_FIX_CLASS : QuickFixAction.CLASS;
	}

	constructor(
		readonly marker: Marker,
	) {
		super(QuickFixAction.ID, Messages.MARKERS_PANEL_ACTION_TOOLTIP_QUICKFIX, QuickFixAction.CLASS, false);
	}

	override run(): Promise<void> {
		this._onShowQuickFixes.fire();
		return Promise.resolve();
	}
}

export class QuickFixActionViewItem extends ActionViewItem {

	constructor(
		action: QuickFixAction,
		options: IActionViewItemOptions,
		@IContextMenuService private readonly contextMenuService: IContextMenuService,
	) {
		super(null, action, { ...options, icon: true, label: false });
	}

	public override onClick(event: DOM.EventLike): void {
		DOM.EventHelper.stop(event, true);
		this.showQuickFixes();
	}

	public showQuickFixes(): void {
		if (!this.element) {
			return;
		}
		if (!this.isEnabled()) {
			return;
		}
		const elementPosition = DOM.getDomNodePagePosition(this.element);
		const quickFixes = (<QuickFixAction>this.action).quickFixes;
		if (quickFixes.length) {
			this.contextMenuService.showContextMenu({
				getAnchor: () => ({ x: elementPosition.left + 10, y: elementPosition.top + elementPosition.height + 4 }),
				getActions: () => quickFixes
			});
		}
	}
}

