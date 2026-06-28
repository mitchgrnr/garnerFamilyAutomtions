/**
 * Executes a function with a specified number of retries and exponential backoff.
 * Useful for mitigating rate limits and temporary network failures when calling Notion API.
 * 
 * @param fn The asynchronous function to execute.
 * @param tries The maximum number of attempts (default 4).
 * @returns The resolved value of the function.
 */
export async function withRetries<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      // backoff: 500ms, 1s, 2s, 4s...
      const delayMs = 500 * Math.pow(2, i);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}
