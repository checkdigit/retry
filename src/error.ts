// error.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { RetryOptions } from './options';

export class RetryError extends Error {
  constructor(
    public options: Required<RetryOptions>,
    lastError: unknown,
  ) {
    super(`Maximum retries (${options.retries}) exceeded`, { cause: lastError });
  }
}
