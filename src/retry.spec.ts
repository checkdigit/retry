// retry.spec.ts

/*
 * Copyright (c) 2021-2025 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import retry, { RetryError } from './index.ts';

function work(
  waiter: (callback: (...argumentList: unknown[]) => void, ...argumentList: unknown[]) => void,
  errorNumber = 0,
) {
  let errorCount = 0;
  return (value: unknown, attempt: number) => {
    assert.equal(errorCount, attempt);
    return new Promise((resolve, reject) => {
      if (errorCount < errorNumber) {
        errorCount++;
        waiter(() => reject(new Error(`Error ${errorCount}/${errorNumber}`)));
      } else {
        waiter(() => resolve(value));
      }
    });
  };
}

const nextTick = process.nextTick.bind(process);

describe('retry', () => {
  it('returns resolved value if no value is passed', async () => {
    assert.equal(await retry(async () => 123)(), 123);
    assert.equal(await retry(async (input) => input)(), undefined);
    assert.equal(await retry(async (_, attempt) => attempt)(), 0);
  });

  it('returns resolved value if item resolves', async () => {
    assert.equal(await retry(async (item: number) => item * 2)(8), 16);

    assert.equal(await retry(work(nextTick))('abc'), 'abc');
    assert.equal(await retry(work(setImmediate))('def'), 'def');
    assert.equal(await retry(work((callback) => setTimeout(callback, 1)))('def'), 'def');
  });

  it('returns resolved value if item eventually resolves', async () => {
    assert.equal(await retry(work(nextTick, 1), { waitRatio: 0 })(1n), 1n);
    assert.equal(await retry(work(setImmediate, 8), { waitRatio: 0 })(123n), 123n);
    assert.equal(
      await retry(
        work((callback) => setTimeout(callback, 2), 8),
        { waitRatio: 0 },
      )(123n),
      123n,
    );
  });

  it('rejects if item reaches DEFAULT_RETRIES (8)', async () => {
    let thrown;
    try {
      await retry(work(setImmediate, Number.POSITIVE_INFINITY), { waitRatio: 0 })(8);
    } catch (error) {
      thrown = error;
    }
    assert.ok(thrown instanceof RetryError);
    assert.deepEqual(thrown.options, {
      retries: 8,
      waitRatio: 0,
      jitter: true,
      maximumBackoff: Number.POSITIVE_INFINITY,
    });
    assert.equal((thrown.cause as Error).message, 'Error 9/Infinity');
  });

  it('number of retries can be selected', async () => {
    assert.equal(await retry(work(nextTick, 0), { retries: 0, waitRatio: 0 })(1n), 1n);
    await assert.rejects(async () => retry(work(nextTick, 2), { retries: 0, waitRatio: 0 })(1n), {
      message: 'Maximum retries (0) exceeded',
    });
    assert.equal(await retry(work(nextTick, 0), { retries: 1, waitRatio: 0 })(1n), 1n);
    assert.equal(await retry(work(nextTick, 1), { retries: 1, waitRatio: 0 })(1n), 1n);
    await assert.rejects(async () => retry(work(nextTick, 2), { retries: 1, waitRatio: 0 })(1n), {
      message: 'Maximum retries (1) exceeded',
    });
  });

  it('throws RangeError on invalid waitRatio values', async () => {
    assert.throws(() => retry(work(nextTick), { waitRatio: -1 }), {
      name: 'RangeError',
      message: 'waitRatio must be >= 0 and <= 60000',
    });
    retry(work(nextTick));
    retry(work(nextTick), {});
    retry(work(nextTick), { waitRatio: 1 });
    retry(work(nextTick), { waitRatio: 60_000 });
    assert.throws(() => retry(work(nextTick), { waitRatio: 60_001 }), {
      name: 'RangeError',
      message: 'waitRatio must be >= 0 and <= 60000',
    });
  });

  it('throws RangeError on invalid retries values', async () => {
    assert.throws(() => retry(work(nextTick), { retries: -1 }), {
      name: 'RangeError',
      message: 'retries must be >= 0 and <= 64',
    });
    retry(work(nextTick));
    retry(work(nextTick), {});
    retry(work(nextTick), { retries: 1 });
    retry(work(nextTick), { retries: 64 });
    assert.throws(() => retry(work(nextTick), { retries: 65 }), {
      name: 'RangeError',
      message: 'retries must be >= 0 and <= 64',
    });
  });

  it('throws RangeError on invalid maximumBackoff values', async () => {
    assert.throws(() => retry(work(nextTick), { maximumBackoff: -1 }), {
      name: 'RangeError',
      message: 'maximumBackoff must be >= 0',
    });
  });

  it('performs well in parallel', async () => {
    const range = [...Array.from({ length: 100_000 }).keys()].map((index) => index.toString().padStart(5, '0'));
    const worker = retry(
      (item) =>
        new Promise((resolve) => {
          // eslint-disable-next-line sonarjs/no-nested-functions
          setTimeout(() => resolve(item), Math.floor(Math.random() * 10) + 1);
        }),
    );
    const results = await Promise.all(range.map(worker));
    // eslint-disable-next-line sonarjs/no-alphabetical-sort
    assert.deepEqual(results.sort(), range);
  });

  it('takes expected amount of time retrying, taking into account jitter', async () => {
    const start = Date.now();
    for (const _ of Array.from({ length: 22 }).keys()) {
      assert.equal(await retry(work(nextTick, 8), { waitRatio: 1 })('abc'), 'abc');
    }
    const time = Date.now() - start;

    // precise timing is impossible due to jitter, but this should take around 3 seconds on average (+- 20%)
    assert.ok(time >= 2400);
    assert.ok(time <= 3600);
  });

  it('takes expected amount of time retrying, no jitter', async () => {
    const start = Date.now();
    assert.equal(await retry(work(nextTick, 8), { waitRatio: 10, jitter: false })('abc'), 'abc');
    const time = Date.now() - start;

    // this should take at least 2550 ms, allow 50 ms overhead for nextTick etc.
    assert.ok(time >= 2550);
    assert.ok(time <= 2600);
  });

  it('takes expected amount of time retrying with maximumBackoff set, taking into account jitter', async () => {
    const start = Date.now();
    for (const _ of Array.from({ length: 22 }).keys()) {
      assert.equal(await retry(work(nextTick, 8), { waitRatio: 1, maximumBackoff: 23 })('abc'), 'abc');
    }
    const time = Date.now() - start;

    // precise timing is impossible due to jitter, but this should take around 1.75 seconds on average (+- 20%)
    assert.ok(time >= 1450, `time ${time} should be >= 1450`);
    assert.ok(time <= 2100, `time ${time} should be >= 2100`);
  });

  it('takes expected amount of time retrying with maximumBackoff set, no jitter', async () => {
    const start = Date.now();
    assert.equal(await retry(work(nextTick, 8), { waitRatio: 10, maximumBackoff: 10, jitter: false })('abc'), 'abc');
    const time = Date.now() - start;

    // this should take a little under 90 ms, allow 50 ms overhead for nextTick etc.
    assert.ok(time >= 80, `time ${time} should be >= 80`);
    assert.ok(time <= 150, `time ${time} should be <= 150`);
  });
});
