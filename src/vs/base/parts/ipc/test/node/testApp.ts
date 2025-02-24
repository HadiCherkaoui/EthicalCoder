/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 EthicalCoder. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Server } from '../../node/ipc.cp.js';
import { TestChannel, TestService } from './testService.js';

const server = new Server('test');
const service = new TestService();
server.registerChannel('test', new TestChannel(service));
