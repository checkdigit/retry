// retry.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import debug from 'debug';

import { RetryError } from './error';
import type { RetryOptions } from './options';

const log = debug('checkdigit:retry');

const MINIMUM_WAIT_RATIO = 0;
const MAXIMUM_WAIT_RATIO = 60_000;

const MINIMUM_RETRIES = 0;
const MAXIMUM_RETRIES = 64;

const MINIMUM_BACKOFF = 0;

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  waitRatio: 100,
  retries: 8,
  jitter: true,
  maximumBackoff: Number.POSITIVE_INFINITY,
};

/**
 * Implementation of recommended Check Digit retry algorithm.  For more details, see AWS documentation for background:
 * - https://docs.aws.amazon.com/general/latest/gr/api-retries.html
 * - https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
 *
 * @param retryable
 * @param waitRatio how much to multiply 2^attempts by
 * @param retries maximum number of retries before throwing a RetryError
 * @param jitter add full jitter to retry wait time
 */
export default function <Input, Output>(
  retryable: (item: Input, attempt: number) => Promise<Output>,
  {
    waitRatio = DEFAULT_OPTIONS.waitRatio,
    retries = DEFAULT_OPTIONS.retries,
    jitter = DEFAULT_OPTIONS.jitter,
    maximumBackoff = DEFAULT_OPTIONS.maximumBackoff,
  }: RetryOptions = DEFAULT_OPTIONS,
): (item?: Input) => Promise<Output> {
  if (waitRatio < MINIMUM_WAIT_RATIO || waitRatio > MAXIMUM_WAIT_RATIO) {
    throw new RangeError(`waitRatio must be >= ${MINIMUM_WAIT_RATIO} and <= ${MAXIMUM_WAIT_RATIO}`);
  }
  if (retries < MINIMUM_RETRIES || retries > MAXIMUM_RETRIES) {
    throw new RangeError(`retries must be >= ${MINIMUM_RETRIES} and <= ${MAXIMUM_RETRIES}`);
  }
  if (maximumBackoff < MINIMUM_BACKOFF) {
    throw new RangeError(`maximumBackoff must be >= ${MINIMUM_BACKOFF}`);
  }

  return (item) =>
    (async function work(attempts = 0): Promise<Output> {
      if (attempts > 0) {
        const waitTime = Math.min(
          jitter
            ? // wait for (2^retries * waitRatio) milliseconds with full jitter
              Math.ceil(Math.random() * (2 ** (attempts - 1) * waitRatio))
            : // wait for (2^retries * waitRatio) milliseconds
              2 ** (attempts - 1) * waitRatio,
          // cap the maximum wait time
          maximumBackoff,
        );
        log(`attempt ${attempts}, waiting for ${waitTime}ms, jitter: ${jitter.toString()}`);
        await new Promise((resolve) => {
          setTimeout(resolve, waitTime);
        });
      }

      const startTime = Date.now();
      try {
        return await retryable(item as Input, attempts);
      } catch (error: unknown) {
        if (attempts >= retries) {
          log(`retries (${retries}) exceeded`);
          throw new RetryError(
            {
              retries,
              waitRatio,
              jitter,
              maximumBackoff,
            },
            error,
          );
        }
        log(`attempt ${attempts} (fail in ${Date.now() - startTime}ms)`);
        return work(attempts + 1);
      }
    })();
}
