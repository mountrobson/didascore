import { useSyncExternalStore } from 'react';

/** localStorage-backed store with React subscription. Safe when storage is blocked. */
export function createStore<T>(key: string, initial: T, persist = true) {
  let state: T = initial;
  if (persist) try {
    const raw = localStorage.getItem(key);
    if (raw) state = { ...initial, ...JSON.parse(raw) };
  } catch {
    /* private mode */
  }
  const subs = new Set<() => void>();
  const set = (next: T | ((s: T) => T)) => {
    state = typeof next === 'function' ? (next as (s: T) => T)(state) : next;
    if (persist) try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* ignore */
    }
    subs.forEach((f) => f());
  };
  const subscribe = (f: () => void) => {
    subs.add(f);
    return () => subs.delete(f);
  };
  const use = () => useSyncExternalStore(subscribe, () => state);
  return { get: () => state, set, use };
}

export interface FavTeam {
  id: string;
  name: string;
  logo?: string;
  league: string; // league slug used for the team page
  sport: string;
}
export interface FavLeague {
  slug: string;
  name: string;
  logo?: string;
  sport: string;
}

export const favorites = createStore<{ teams: FavTeam[]; leagues: FavLeague[]; matches: string[] }>('dida.favorites', {
  teams: [],
  leagues: [],
  matches: [],
});

export const settings = createStore<{ theme: 'system' | 'dark' | 'light'; h24: boolean; goalAlerts: boolean }>('dida.settings', {
  theme: 'system',
  h24: !new Intl.DateTimeFormat([], { hour: 'numeric' }).resolvedOptions().hour12,
  goalAlerts: false,
});

export const ui = createStore<{ collapsed: Record<string, boolean> }>('dida.ui', { collapsed: {} });

export function toggleTeam(t: FavTeam) {
  favorites.set((s) => ({
    ...s,
    teams: s.teams.some((x) => x.id === t.id) ? s.teams.filter((x) => x.id !== t.id) : [...s.teams, t],
  }));
}
export function toggleLeague(l: FavLeague) {
  favorites.set((s) => ({
    ...s,
    leagues: s.leagues.some((x) => x.slug === l.slug) ? s.leagues.filter((x) => x.slug !== l.slug) : [...s.leagues, l],
  }));
}
export function toggleMatch(id: string) {
  favorites.set((s) => ({ ...s, matches: s.matches.includes(id) ? s.matches.filter((x) => x !== id) : [...s.matches, id] }));
}
