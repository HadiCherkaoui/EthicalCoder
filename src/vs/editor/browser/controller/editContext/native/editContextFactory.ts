/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 EthicalCoder. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


export namespace EditContext {

	/**
	 * Create an edit context.
	 */
	export function create(window: Window, options?: EditContextInit): EditContext {
		return new (window as any).EditContext(options);
	}
}
