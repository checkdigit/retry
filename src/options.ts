// options.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

export interface RetryOptions {
  waitRatio?: number;
  retries?: number;
  jitter?: boolean;
}
