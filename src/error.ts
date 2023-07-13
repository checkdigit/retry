// error.ts

/*
 * Copyright (c) 2021-2023 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

export class RetryError extends Error {
  constructor(public retries: number, public lastError: Error) {
    super(`Maximum retries (${retries}) exceeded`);
  }
}
