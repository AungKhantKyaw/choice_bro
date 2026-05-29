export async function retry<T>(
  fn: () => Promise<T>,
  retries = 2,
): Promise<T> {
  let lastError;

  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError;
}