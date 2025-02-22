/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 EthicalCoder. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { EditorInput } from '../../../common/editor/editorInput.js';
import { IEditorSerializer } from '../../../common/editor.js';
import { EditorModel } from '../../../common/editor/editorModel.js';

export class ComposerEditorInput extends EditorInput implements IEditorSerializer {

	static readonly ID = 'Composer.chat';

	override get typeId(): string {
		return ComposerEditorInput.ID;
	}

	override get resource(): undefined {
		return undefined;
	}

	constructor() {
		super();
	}

	override async resolve(): Promise<EditorModel | null> {
		return null;
	}

	override matches(other: unknown): boolean {
		return other instanceof ComposerEditorInput;
	}

	canSupportSideBySide(): boolean {
		return false;
	}

	canSerialize(): boolean {
		return true;
	}

	// Serializer implementation
	serialize(): string | undefined {
		return undefined;
	}

	deserialize(): EditorInput | undefined {
		return new ComposerEditorInput();
	}
}
