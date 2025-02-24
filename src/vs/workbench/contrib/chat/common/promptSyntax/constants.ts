/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 EthicalCoder. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export const PROMPT_FILE_EXTENSION = '.prompt';

export const Constants = {
	PROMPT_FILE_EXTENSION
};

export default Constants;

/**
 * Documentation link for the reusable prompts feature.
 */
export const DOCUMENTATION_URL = 'https://aka.ms/vscode-ghcp-prompt-snippets';

/**
 * Prompt files language selector.
 */
export const LANGUAGE_SELECTOR = Object.freeze({
	pattern: `**/*${PROMPT_FILE_EXTENSION}`,
});
