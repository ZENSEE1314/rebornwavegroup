// Runs a request's work once per key. A POS that lost its connection sends the same request again with the same key: the second call gets the first call's
// answer (even while the first is still running) instead of adding the items a second time. Kept in memory for a short while; a restart forgets it.

export const RUN_ONCE_KEEP_MS = 10 * 60_000;

export function createRunOnce(now: () => number = Date.now) {
  const entries = new Map<string, { at: number; result: Promise<unknown> }>();

  return function runOnce<T>(key: string, work: () => Promise<T>): Promise<T> {
    entries.forEach((entry, k) => { if (now() - entry.at > RUN_ONCE_KEEP_MS) entries.delete(k); });
    const known = entries.get(key);
    if (known) return known.result as Promise<T>;
    const result = work();
    entries.set(key, { at: now(), result });
    result.catch(() => entries.delete(key)); // a crash is not an answer: the retry may run again
    return result;
  };
}
