/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 EthicalCoder. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as DOM from '../../../../../../base/browser/dom.js';
import { disposableTimeout } from '../../../../../../base/common/async.js';
import { DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { clamp } from '../../../../../../base/common/numbers.js';
import { ICellViewModel, INotebookEditorDelegate } from '../../notebookBrowser.js';
import { CellViewModelStateChangeEvent } from '../../notebookViewEvents.js';
import { CellContentPart } from '../cellPart.js';
import { CodeCellViewModel } from '../../viewModel/codeCellViewModel.js';
import { NotebookCellInternalMetadata } from '../../../common/notebookCommon.js';
import { INotebookExecutionStateService } from '../../../common/notebookExecutionStateService.js';

const UPDATE_EXECUTION_ORDER_GRACE_PERIOD = 200;

export class CellExecutionPart extends CellContentPart {
	private readonly kernelDisposables = this._register(new DisposableStore());

	constructor(
		private readonly _notebookEditor: INotebookEditorDelegate,
		private readonly _executionOrderLabel: HTMLElement,
		@INotebookExecutionStateService private readonly _notebookExecutionStateService: INotebookExecutionStateService
	) {
		super();

		this._register(this._notebookEditor.onDidChangeActiveKernel(() => {
			if (this.currentCell) {
				this.kernelDisposables.clear();

				if (this._notebookEditor.activeKernel) {
					this.kernelDisposables.add(this._notebookEditor.activeKernel.onDidChange(() => {
						if (this.currentCell) {
							this.updateExecutionOrder(this.currentCell.internalMetadata);
						}
					}));
				}

				this.updateExecutionOrder(this.currentCell.internalMetadata);
			}
		}));

		this._register(this._notebookEditor.onDidScroll(() => {
			this._updatePosition();
		}));
	}

	override didRenderCell(element: ICellViewModel): void {
		this.updateExecutionOrder(element.internalMetadata, true);
	}

	private updateExecutionOrder(internalMetadata: NotebookCellInternalMetadata, forceClear = false): void {
		if (this._notebookEditor.activeKernel?.implementsExecutionOrder || (!this._notebookEditor.activeKernel && typeof internalMetadata.executionOrder === 'number')) {
			// If the executionOrder was just cleared, and the cell is executing, wait just a bit before clearing the view to avoid flashing
			if (typeof internalMetadata.executionOrder !== 'number' && !forceClear && !!this._notebookExecutionStateService.getCellExecution(this.currentCell!.uri)) {
				const renderingCell = this.currentCell;
				disposableTimeout(() => {
					if (this.currentCell === renderingCell) {
						this.updateExecutionOrder(this.currentCell!.internalMetadata, true);
					}
				}, UPDATE_EXECUTION_ORDER_GRACE_PERIOD, this.cellDisposables);
				return;
			}

			const executionOrderLabel = typeof internalMetadata.executionOrder === 'number' ?
				`[${internalMetadata.executionOrder}]` :
				'[ ]';
			this._executionOrderLabel.innerText = executionOrderLabel;
		} else {
			this._executionOrderLabel.innerText = '';
		}
	}

	override updateState(element: ICellViewModel, e: CellViewModelStateChangeEvent): void {
		if (e.internalMetadataChanged) {
			this.updateExecutionOrder(element.internalMetadata);
		}
	}

	override updateInternalLayoutNow(element: ICellViewModel): void {
		this._updatePosition();
	}

	private _updatePosition() {
		if (this.currentCell) {
			if (this.currentCell.isInputCollapsed) {
				DOM.hide(this._executionOrderLabel);
			} else {
				DOM.show(this._executionOrderLabel);
				let top = this.currentCell.layoutInfo.editorHeight - 22 + this.currentCell.layoutInfo.statusBarHeight;

				if (this.currentCell instanceof CodeCellViewModel) {
					const elementTop = this._notebookEditor.getAbsoluteTopOfElement(this.currentCell);
					const editorBottom = elementTop + this.currentCell.layoutInfo.outputContainerOffset;
					// another approach to avoid the flicker caused by sticky scroll is manually calculate the scrollBottom:
					// const scrollBottom = this._notebookEditor.scrollTop + this._notebookEditor.getLayoutInfo().height - 26 - this._notebookEditor.getLayoutInfo().stickyHeight;
					const scrollBottom = this._notebookEditor.scrollBottom;

					const lineHeight = 22;
					if (scrollBottom <= editorBottom) {
						const offset = editorBottom - scrollBottom;
						top -= offset;
						top = clamp(
							top,
							lineHeight + 12, // line height + padding for single line
							this.currentCell.layoutInfo.editorHeight - lineHeight + this.currentCell.layoutInfo.statusBarHeight
						);
					}
				}

				this._executionOrderLabel.style.top = `${top}px`;
			}
		}
	}
}
