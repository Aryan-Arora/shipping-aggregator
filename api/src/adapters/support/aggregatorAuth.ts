import { withRetry } from "./withRetry";

interface CachedToken {
  token: string;
  expiresAt: number; // epoch ms
}

const tokenCache = new Map<string, CachedToken>();

// Aggregator APIs (Shiprocket etc.) hand out a short-lived bearer token from a
// login call rather than a static API key. This caches it per-courier and
// only re-authenticates once it's actually close to expiring.
export async function getCachedToken(
  cacheKey: string,
  login: () => Promise<{ token: string; expiresInSeconds: number }>
): Promise<string> {
  const cached = tokenCache.get(cacheKey);
  const now = Date.now();
  const safetyMarginMs = 60_000;

  if (cached && cached.expiresAt - safetyMarginMs > now) {
    return cached.token;
  }

  const { token, expiresInSeconds } = await withRetry(login, { retries: 2 });
  tokenCache.set(cacheKey, { token, expiresAt: now + expiresInSeconds * 1000 });
  return token;
}

export function clearCachedToken(cacheKey: string) {
  tokenCache.delete(cacheKey);
}
