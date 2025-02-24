/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 EthicalCoder. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import 'mocha';
import * as vscode from 'vscode';
import { templateToSnippet } from '../../languageFeatures/jsDocCompletions';
import { joinLines } from '../testUtils';

suite('typescript.jsDocSnippet', () => {

	setup(async () => {
		// the tests assume that typescript features are registered
		await vscode.extensions.getExtension('vscode.typescript-language-features')!.activate();
	});

	test('Should do nothing for single line input', async () => {
		const input = `/** */`;
		assert.strictEqual(templateToSnippet(input).value, input);
	});

	test('Should put cursor inside multiline line input', async () => {
		assert.strictEqual(
			templateToSnippet(joinLines(
				'/**',
				' * ',
				' */'
			)).value,
			joinLines(
				'/**',
				' * $0',
				' */'
			));
	});

	test('Should add placeholders after each parameter', async () => {
		assert.strictEqual(
			templateToSnippet(joinLines(
				'/**',
				' * @param a',
				' * @param b',
				' */'
			)).value,
			joinLines(
				'/**',
				' * @param a ${1}',
				' * @param b ${2}',
				' */'
			));
	});

	test('Should add placeholders for types', async () => {
		assert.strictEqual(
			templateToSnippet(joinLines(
				'/**',
				' * @param {*} a',
				' * @param {*} b',
				' */'
			)).value,
			joinLines(
				'/**',
				' * @param {${1:*}} a ${2}',
				' * @param {${3:*}} b ${4}',
				' */'
			));
	});

	test('Should properly escape dollars in parameter names', async () => {
		assert.strictEqual(
			templateToSnippet(joinLines(
				'/**',
				' * ',
				' * @param $arg',
				' */'
			)).value,
			joinLines(
				'/**',
				' * $0',
				' * @param \\$arg ${1}',
				' */'
			));
	});
});
