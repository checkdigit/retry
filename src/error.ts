// error.ts

/*
 * Copyright (c) 2021-2025 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { RetryOptions } from './options.ts';

export class RetryError extends Error {
  public options: Required<RetryOptions>;
  constructor(options: Required<RetryOptions>, lastError: unknown) {
    super(`Maximum retries (${options.retries}) exceeded`, { cause: lastError });
    this.options = options;
  }
}
