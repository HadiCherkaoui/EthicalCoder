/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 EthicalCoder. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

declare module 'vscode' {

	// TODO - @lramos15 - Issue link

	export interface LanguageModelChat {
		/**
		 * The capabilities of the language model.
		 */
		readonly capabilities: {
			/**
			 * Whether the language model supports tool calling.
			 */
			readonly supportsToolCalling: boolean;
			/**
			 * Whether the language model supports image to text. This means it can take an image as input and produce a text response.
			 */
			readonly supportsImageToText: boolean;
		};
	}
}
