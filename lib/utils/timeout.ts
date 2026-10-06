/**
 * Runs `fn` with a deadline. When the deadline passes, the AbortSignal passed
 * to `fn` is aborted (so the work can actually stop, e.g. by closing its page)
 * and the returned promise rejects. The timer is always cleared.
 */
export async function withDeadline<T>(
  ms: number,
  fn: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`Timed out after ${ms}ms`);
      controller.abort(err);
      reject(err);
    }, ms);
  });

  try {
    return await Promise.race([fn(controller.signal), deadline]);
  } finally {
    clearTimeout(timer);
  }
}
