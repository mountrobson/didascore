import { useCallback, useEffect, useRef, useState } from 'react';

interface PollState<T> {
  data?: T;
  error?: Error;
  loading: boolean;
  updatedAt?: number;
}

/**
 * Fetch now, then refetch every `interval(data)` ms while the tab is visible.
 * Returning 0 from interval stops polling (e.g. finished matches).
 */
export function usePoll<T>(fetcher: () => Promise<T>, deps: unknown[], interval: (d?: T) => number, initial?: T) {
  const [st, setSt] = useState<PollState<T>>({ data: initial, loading: true });
  const timer = useRef<number>();
  const alive = useRef(true);
  const dataRef = useRef<T | undefined>(initial);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(async () => {
    window.clearTimeout(timer.current);
    try {
      const d = await fetcher();
      if (!alive.current) return;
      dataRef.current = d;
      setSt({ data: d, loading: false, updatedAt: Date.now() });
    } catch (e) {
      if (!alive.current) return;
      setSt((s) => ({ ...s, error: e as Error, loading: false }));
    }
    const ms = interval(dataRef.current);
    if (ms > 0 && document.visibilityState === 'visible') timer.current = window.setTimeout(run, ms);
  }, deps);

  useEffect(() => {
    alive.current = true;
    setSt({ data: initial, loading: true });
    dataRef.current = initial;
    run();
    const onVis = () => {
      if (document.visibilityState === 'visible') run();
      else window.clearTimeout(timer.current);
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('online', run);
    return () => {
      alive.current = false;
      window.clearTimeout(timer.current);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('online', run);
    };
  }, [run]);

  return { ...st, refresh: run };
}
