/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 EthicalCoder. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export const TIMED_OUT_ERROR = 'Timed out';

// These error messages are internal and should not be shown to the user in any way.
export const USER_CANCELLATION_ERROR = 'User Cancelled';
export const NETWORK_ERROR = 'network error';

// This is the error message that we throw if the login was cancelled for any reason. Extensions
// calling `getSession` can handle this error to know that the user cancelled the login.
export const CANCELLATION_ERROR = 'Cancelled';
