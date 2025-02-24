/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 EthicalCoder. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IDisposable } from '../../../../../base/common/lifecycle.js';
import { ChatTreeItem, IChatCodeBlockInfo } from '../chat.js';
import { IChatRendererContent } from '../../common/chatViewModel.js';

export interface IChatContentPart extends IDisposable {
	domNode: HTMLElement;

	/**
	 * Used to indicate a part's ownership of a code block.
	 */
	codeblocksPartId?: string;

	/**
	 * Codeblocks that were rendered by this part into CodeBlockModelCollection.
	 */
	codeblocks?: IChatCodeBlockInfo[];

	/**
	 * Returns true if the other content is equivalent to what is already rendered in this content part.
	 * Returns false if a rerender is needed.
	 * followingContent is all the content that will be rendered after this content part (to support progress messages' behavior).
	 */
	hasSameContent(other: IChatRendererContent, followingContent: IChatRendererContent[], element: ChatTreeItem): boolean;

	addDisposable?(disposable: IDisposable): void;
}

export interface IChatContentPartRenderContext {
	element: ChatTreeItem;
	content: ReadonlyArray<IChatRendererContent>;
	contentIndex: number;
	preceedingContentParts: ReadonlyArray<IChatContentPart>;
}
