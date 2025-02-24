/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 EthicalCoder. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

//@ts-check

'use strict';

const path = require('path');
const withBrowserDefaults = require('../shared.webpack.config').browser;

module.exports = withBrowserDefaults({
	context: __dirname,
	node: {
		global: true,
		__filename: false,
		__dirname: false,
	},
	entry: {
		extension: './src/extension.ts',
	},
	resolve: {
		alias: {
			'./node/authServer': path.resolve(__dirname, 'src/browser/authServer'),
			'./node/buffer': path.resolve(__dirname, 'src/browser/buffer'),
			'./node/fetch': path.resolve(__dirname, 'src/browser/fetch'),
			'./node/authProvider': path.resolve(__dirname, 'src/browser/authProvider'),
		}
	}
});
