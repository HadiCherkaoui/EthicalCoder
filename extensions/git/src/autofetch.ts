/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 EthicalCoder. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { workspace, Disposable, EventEmitter, Memento, window, MessageItem, ConfigurationTarget, Uri, ConfigurationChangeEvent, l10n, env } from 'vscode';
import { Repository } from './repository';
import { eventToPromise, filterEvent, onceEvent } from './util';
import { GitErrorCodes } from './api/git';

export class AutoFetcher {

	private static DidInformUser = 'autofetch.didInformUser';

	private _onDidChange = new EventEmitter<boolean>();
	private onDidChange = this._onDidChange.event;

	private _enabled: boolean = false;
	private _fetchAll: boolean = false;
	get enabled(): boolean { return this._enabled; }
	set enabled(enabled: boolean) { this._enabled = enabled; this._onDidChange.fire(enabled); }

	private disposables: Disposable[] = [];

	constructor(private repository: Repository, private globalState: Memento) {
		workspace.onDidChangeConfiguration(this.onConfiguration, this, this.disposables);
		this.onConfiguration();

		const onGoodRemoteOperation = filterEvent(repository.onDidRunOperation, ({ operation, error }) => !error && operation.remote);
		const onFirstGoodRemoteOperation = onceEvent(onGoodRemoteOperation);
		onFirstGoodRemoteOperation(this.onFirstGoodRemoteOperation, this, this.disposables);
	}

	private async onFirstGoodRemoteOperation(): Promise<void> {
		const didInformUser = !this.globalState.get<boolean>(AutoFetcher.DidInformUser);

		if (this.enabled && !didInformUser) {
			this.globalState.update(AutoFetcher.DidInformUser, true);
		}

		const shouldInformUser = !this.enabled && didInformUser;

		if (!shouldInformUser) {
			return;
		}

		const yes: MessageItem = { title: l10n.t('Yes') };
		const no: MessageItem = { isCloseAffordance: true, title: l10n.t('No') };
		const askLater: MessageItem = { title: l10n.t('Ask Me Later') };
		const result = await window.showInformationMessage(l10n.t('Would you like {0} to [periodically run "git fetch"]({1})?', env.appName, 'https://go.microsoft.com/fwlink/?linkid=865294'), yes, no, askLater);

		if (result === askLater) {
			return;
		}

		if (result === yes) {
			const gitConfig = workspace.getConfiguration('git', Uri.file(this.repository.root));
			gitConfig.update('autofetch', true, ConfigurationTarget.Global);
		}

		this.globalState.update(AutoFetcher.DidInformUser, true);
	}

	private onConfiguration(e?: ConfigurationChangeEvent): void {
		if (e !== undefined && !e.affectsConfiguration('git.autofetch')) {
			return;
		}

		const gitConfig = workspace.getConfiguration('git', Uri.file(this.repository.root));
		switch (gitConfig.get<boolean | 'all'>('autofetch')) {
			case true:
				this._fetchAll = false;
				this.enable();
				break;
			case 'all':
				this._fetchAll = true;
				this.enable();
				break;
			case false:
			default:
				this._fetchAll = false;
				this.disable();
				break;
		}
	}

	enable(): void {
		if (this.enabled) {
			return;
		}

		this.enabled = true;
		this.run();
	}

	disable(): void {
		this.enabled = false;
	}

	private async run(): Promise<void> {
		while (this.enabled) {
			await this.repository.whenIdleAndFocused();

			if (!this.enabled) {
				return;
			}

			try {
				if (this._fetchAll) {
					await this.repository.fetchAll({ silent: true });
				} else {
					await this.repository.fetchDefault({ silent: true });
				}
			} catch (err) {
				if (err.gitErrorCode === GitErrorCodes.AuthenticationFailed) {
					this.disable();
				}
			}

			if (!this.enabled) {
				return;
			}

			const period = workspace.getConfiguration('git', Uri.file(this.repository.root)).get<number>('autofetchPeriod', 180) * 1000;
			const timeout = new Promise(c => setTimeout(c, period));
			const whenDisabled = eventToPromise(filterEvent(this.onDidChange, enabled => !enabled));

			await Promise.race([timeout, whenDisabled]);
		}
	}

	dispose(): void {
		this.disable();
		this.disposables.forEach(d => d.dispose());
	}
}
