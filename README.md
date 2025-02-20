# checkdigit/retry

Copyright © 2021–2025 [Check Digit, LLC](https://checkdigit.com)

The `@checkdigit/retry` module implements the recommended Check Digit retry algorithm for idempotent distributed work.

The default recommended behavior for production usage is to retry up to eight times, with an exponential backoff
of `(2^retries * 100)` milliseconds per retry **with full jitter**.
This logic matches the
[AWS recommended algorithm](https://docs.aws.amazon.com/general/latest/gr/api-retries.html) and
[AWS exponential backoff and jitter doc](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/).

However, both the default `waitRatio` (100), `retries` (8),
`jitter` (true) and `maximumBackoff` (+Infinity) can be overridden.
For test scenarios, it is useful to set the `waitRatio` to `0` to force immediate retries.

If the number of allowable retries is exceeded,
a `RetryError` is thrown with the `options` property set to the input options,
and `cause` set to the error thrown on the last retry attempt.

**NOTE: this module assumes all work is idempotent, and can be retried multiple times without consequence. If that is
not the case, do not use this module.**

## Installing

```shell
npm install @checkdigit/retry
```

## Use

```ts
import retry from '@checkdigit/retry';

// do some simple work, with the default of 8 retries and a wait ratio of 100.
const worker = retry(async (item: string) => {
  /* idempotent network requests */
});
const result = await worker(someInput);

// Do some simple work, with a wait ratio of 0.  This means retries occur immediately, useful for test scenarios.
const testWorker = retry(
  async (item: string) => {
    /* ...idempotent network requests... */
  },
  { waitRatio: 0 },
);
const testResult = await testWorker(someTestInput);

// catch a RetryError
const errorWorker = retry(
  async (item: string) => {
    /* ...repeated failures... */
  },
  { waitRatio: 0 },
);
try {
  await errorWorker(someTestInput);
} catch (error) {
  if (error instanceof RetryError) {
    console.log('failed after ' + error.options.retries);
    console.log(error.cause);
  }
}
```

## Using with [`@checkdigit/timeout`](https://github.com/checkdigit/timeout)

In some scenarios, it is recommended that this module is combined with
[`@checkdigit/timeout`](https://github.com/checkdigit/timeout).

```ts
import retry from '@checkdigit/retry';
import timeout from '@checkdigit/timeout';

// wait up to 60 seconds on each attempt, retry on timeout
const worker = await retry((item) =>
  timeout(
    (async (input) => {
      /* ...work... */
    })(item),
  ),
);
const result = await worker(someInput);
```

## License

MIT
