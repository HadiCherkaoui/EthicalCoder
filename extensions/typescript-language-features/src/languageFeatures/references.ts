/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 EthicalCoder. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { DocumentSelector } from '../configuration/documentSelector';
import * as typeConverters from '../typeConverters';
import { ClientCapability, ITypeScriptServiceClient } from '../typescriptService';
import { conditionalRegistration, requireSomeCapability } from './util/dependentRegistration';

class TypeScriptReferenceSupport implements vscode.ReferenceProvider {
	public constructor(
		private readonly client: ITypeScriptServiceClient) { }

	public async provideReferences(
		document: vscode.TextDocument,
		position: vscode.Position,
		options: vscode.ReferenceContext,
		token: vscode.CancellationToken
	): Promise<vscode.Location[]> {
		const filepath = this.client.toOpenTsFilePath(document);
		if (!filepath) {
			return [];
		}

		const args = typeConverters.Position.toFileLocationRequestArgs(filepath, position);
		const response = await this.client.execute('references', args, token);
		if (response.type !== 'response' || !response.body) {
			return [];
		}

		const result: vscode.Location[] = [];
		for (const ref of response.body.refs) {
			if (!options.includeDeclaration && ref.isDefinition) {
				continue;
			}
			const url = this.client.toResource(ref.file);
			const location = typeConverters.Location.fromTextSpan(url, ref);
			result.push(location);
		}
		return result;
	}
}

export function register(
	selector: DocumentSelector,
	client: ITypeScriptServiceClient
) {
	return conditionalRegistration([
		requireSomeCapability(client, ClientCapability.EnhancedSyntax, ClientCapability.Semantic),
	], () => {
		return vscode.languages.registerReferenceProvider(selector.syntax,
			new TypeScriptReferenceSupport(client));
	});
}
