// error.ts

export class RetryError extends Error {
  constructor(
    public retries: number,
    public lastError: Error,
  ) {
    super(`Maximum retries (${retries}) exceeded`);
  }
}
