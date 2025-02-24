/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 EthicalCoder. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import 'mocha';
import * as vscode from 'vscode';
import { createTestEditor, joinLines, wait } from '../../test/testUtils';
import { disposeAll } from '../../utils/dispose';

const testDocumentUri = vscode.Uri.parse('untitled:test.ts');

const emptyRange = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0));

suite.skip('TypeScript Fix All', () => {

	const _disposables: vscode.Disposable[] = [];

	setup(async () => {
		// the tests assume that typescript features are registered
		await vscode.extensions.getExtension('vscode.typescript-language-features')!.activate();
	});

	teardown(async () => {
		disposeAll(_disposables);

		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
	});

	test('Fix all should remove unreachable code', async () => {
		const editor = await createTestEditor(testDocumentUri,
			`function foo() {`,
			`    return 1;`,
			`    return 2;`,
			`};`,
			`function boo() {`,
			`    return 3;`,
			`    return 4;`,
			`};`,
		);

		await wait(2000);

		const fixes = await vscode.commands.executeCommand<vscode.CodeAction[]>('vscode.executeCodeActionProvider',
			testDocumentUri,
			emptyRange,
			vscode.CodeActionKind.SourceFixAll
		);

		await vscode.workspace.applyEdit(fixes![0].edit!);

		assert.strictEqual(editor.document.getText(), joinLines(
			`function foo() {`,
			`    return 1;`,
			`};`,
			`function boo() {`,
			`    return 3;`,
			`};`,
		));

	});

	test('Fix all should implement interfaces', async () => {
		const editor = await createTestEditor(testDocumentUri,
			`interface I {`,
			`    x: number;`,
			`}`,
			`class A implements I {}`,
			`class B implements I {}`,
		);

		await wait(2000);

		const fixes = await vscode.commands.executeCommand<vscode.CodeAction[]>('vscode.executeCodeActionProvider',
			testDocumentUri,
			emptyRange,
			vscode.CodeActionKind.SourceFixAll
		);

		await vscode.workspace.applyEdit(fixes![0].edit!);
		assert.strictEqual(editor.document.getText(), joinLines(
			`interface I {`,
			`    x: number;`,
			`}`,
			`class A implements I {`,
			`    x: number;`,
			`}`,
			`class B implements I {`,
			`    x: number;`,
			`}`,
		));
	});

	test('Remove unused should handle nested ununused', async () => {
		const editor = await createTestEditor(testDocumentUri,
			`export const _ = 1;`,
			`function unused() {`,
			`    const a = 1;`,
			`}`,
			`function used() {`,
			`    const a = 1;`,
			`}`,
			`used();`
		);

		await wait(2000);

		const fixes = await vscode.commands.executeCommand<vscode.CodeAction[]>('vscode.executeCodeActionProvider',
			testDocumentUri,
			emptyRange,
			vscode.CodeActionKind.Source.append('removeUnused')
		);

		await vscode.workspace.applyEdit(fixes![0].edit!);
		assert.strictEqual(editor.document.getText(), joinLines(
			`export const _ = 1;`,
			`function used() {`,
			`}`,
			`used();`
		));
	});

	test('Remove unused should remove unused interfaces', async () => {
		const editor = await createTestEditor(testDocumentUri,
			`export const _ = 1;`,
			`interface Foo {}`
		);

		await wait(2000);

		const fixes = await vscode.commands.executeCommand<vscode.CodeAction[]>('vscode.executeCodeActionProvider',
			testDocumentUri,
			emptyRange,
			vscode.CodeActionKind.Source.append('removeUnused')
		);

		await vscode.workspace.applyEdit(fixes![0].edit!);
		assert.strictEqual(editor.document.getText(), joinLines(
			`export const _ = 1;`,
			``
		));
	});
});
