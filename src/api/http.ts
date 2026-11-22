// Tiny fetch cache: de-duplicates concurrent requests and serves fresh-enough data from memory.
const cache = new Map<string, { t: number; data: unknown }>();
const inflight = new Map<string, Promise<unknown>>();

export async function getJSON<T>(url: string, ttlMs = 15_000): Promise<T> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.t < ttlMs) return hit.data as T;
  const pending = inflight.get(url);
  if (pending) return pending as Promise<T>;
  const p = fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error(`Request failed (${r.status})`);
      return r.json();
    })
    .then((data) => {
      cache.set(url, { t: Date.now(), data });
      return data;
    })
    .finally(() => inflight.delete(url));
  inflight.set(url, p);
  return p as Promise<T>;
}

/** Last cached copy regardless of age, for instant paint while refetching. */
export function peekJSON<T>(url: string): T | undefined {
  return cache.get(url)?.data as T | undefined;
}
