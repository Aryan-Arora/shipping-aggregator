import { withRetry } from "./withRetry";

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
}

export class AggregatorApiError extends Error {
  constructor(message: string, public status: number, public body: unknown) {
    super(message);
    this.name = "AggregatorApiError";
  }
}

// 4xx (bad request, auth) shouldn't retry — retrying a malformed request just
// wastes time and delays the real error surfacing. 5xx and network errors are
// worth retrying since they're often transient on the courier's side.
function isRetryable(err: unknown) {
  return !(err instanceof AggregatorApiError) || err.status >= 500;
}

export async function aggregatorRequest<T>(url: string, options: RequestOptions = {}): Promise<T> {
  return withRetry(
    async () => {
      const res = await fetch(url, {
        method: options.method ?? "GET",
        headers: { "Content-Type": "application/json", ...options.headers },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        throw new AggregatorApiError(`Aggregator API request failed: ${res.status}`, res.status, body);
      }

      return body as T;
    },
    { retries: 3, baseDelayMs: 400, shouldRetry: (err) => isRetryable(err) }
  );
}
