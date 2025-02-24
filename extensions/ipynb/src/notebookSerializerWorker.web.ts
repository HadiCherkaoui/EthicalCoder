/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 EthicalCoder. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { serializeNotebookToString } from './serializers';
import type { NotebookData } from 'vscode';

onmessage = (e) => {
	const data = e.data as { id: string; data: NotebookData };
	const json = serializeNotebookToString(data.data);
	const bytes = new TextEncoder().encode(json);
	postMessage({ id: data.id, data: bytes });
};
