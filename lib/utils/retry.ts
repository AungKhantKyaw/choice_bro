/**
 * Retries `fn` up to `retries` extra times. Stops immediately once `signal`
 * is aborted, so retries can't outlive the caller's deadline.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  retries = 2,
  signal?: AbortSignal,
): Promise<T> {
  let lastError: unknown;

  for (let i = 0; i <= retries; i++) {
    signal?.throwIfAborted();
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (signal?.aborted) break;
    }
  }

  throw lastError;
}
