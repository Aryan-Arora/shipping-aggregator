export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  /** Called before each retry; return false to abort retrying (e.g. on a 4xx). */
  shouldRetry?: (err: unknown, attempt: number) => boolean;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Real courier APIs rate-limit and blip in ways mocks never do — this wraps
// any call in exponential backoff so a transient failure doesn't surface as
// a broken rate-comparison or booking for the seller.
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { retries = 3, baseDelayMs = 300, shouldRetry = () => true } = options;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isLastAttempt = attempt === retries;
      if (isLastAttempt || !shouldRetry(err, attempt)) throw err;
      await sleep(baseDelayMs * 2 ** attempt);
    }
  }
  throw lastError;
}
