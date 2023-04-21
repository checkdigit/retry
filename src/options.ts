// options.ts

export interface RetryOptions {
  waitRatio?: number;
  retries?: number;
  jitter?: boolean;
}
