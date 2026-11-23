/* "Top Form": the best average DiDa rating over each player's last N league matches, top 5 leagues.
 * Pass 1 rates every player from the match summaries (box score, one request per match).
 * Pass 2 re-rates the 40 best with the full DiDa rating (ESPN per-player detail), then ranks the top 10. */
import { getLeagueMatchDays, getMatchLineupsQuick, getPlayerMatchLine, leagueFromIndex, getLeagues } from './espn';
import type { Match, Team } from './types';

export interface FormGame { id: string; date: string; league: string; opponent: Team; rating: number; goals: number; assists: number; result?: 'W' | 'D' | 'L' }
export interface FormRow { id: string; name: string; position?: string; team: Team; league: string; leagueName: string; avg: number; games: FormGame[]; goals: number; assists: number }

export const FORM_LEAGUES = ['esp.1', 'eng.1', 'ita.1', 'ger.1', 'fra.1'];

async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k]); }
  }));
  return out;
}

const avg = (xs: number[]) => xs.reduce((t, x) => t + x, 0) / xs.length;

const memo = new Map<string, { at: number; rows: FormRow[] }>();
const TTL = 30 * 60_000;

export function peekInForm(n: number, leagues = FORM_LEAGUES): FormRow[] | undefined {
  const key = `dida.form.${n}.${leagues.join(',')}`;
  const m = memo.get(key);
  if (m && Date.now() - m.at < TTL) return m.rows;
  try {
    const c = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (c && Date.now() - c.at < TTL) { memo.set(key, c); return c.rows; }
  } catch { /* ignore */ }
  return undefined;
}

export async function getInForm(n = 3, leagues = FORM_LEAGUES, onProgress?: (done: number, total: number) => void): Promise<FormRow[]> {
  const key = `dida.form.${n}.${leagues.join(',')}`;
  const cached = peekInForm(n, leagues);
  if (cached) return cached;
  await getLeagues('soccer').catch(() => undefined);

  // Each team's last n finished league matches.
  const matches: Match[] = [];
  for (const slug of leagues) {
    const ms = (await getLeagueMatchDays('soccer', slug, 'prev', n * 4 + 2, 600_000).catch(() => [] as Match[])).filter((m) => m.state === 'post');
    const byTeam = new Map<string, Match[]>();
    for (const m of ms.sort((a, b) => b.date.localeCompare(a.date))) {
      for (const t of [m.home.team.id, m.away.team.id]) {
        const l = byTeam.get(t) ?? [];
        if (l.length < n) l.push(m);
        byTeam.set(t, l);
      }
    }
    const ids = new Set<string>();
    for (const l of byTeam.values()) for (const m of l) if (!ids.has(m.id)) { ids.add(m.id); matches.push({ ...m, leagueSlug: slug }); }
  }

  // Pass 1: quick ratings for everyone.
  let done = 0;
  const total = matches.length;
  onProgress?.(0, total);
  const quick = await pool(matches, 8, async (m) => {
    const r = await getMatchLineupsQuick('soccer', m.leagueSlug, m.id).catch(() => undefined);
    onProgress?.(++done, total);
    return r;
  });

  interface Acc { id: string; name: string; position?: string; team: Team; league: string; games: (FormGame & { teamId: string })[] }
  const players = new Map<string, Acc>();
  quick.forEach((q, i) => {
    if (!q) return;
    const m = matches[i];
    for (const l of q.lineups) {
      const opp = l.side === 'home' ? q.match.away.team : q.match.home.team;
      const mine = Number(l.side === 'home' ? q.match.home.score : q.match.away.score);
      const theirs = Number(l.side === 'home' ? q.match.away.score : q.match.home.score);
      for (const p of l.players) {
        if (p.rating == null) continue;
        const a = players.get(p.id) ?? { id: p.id, name: p.name, position: p.position, team: l.team, league: m.leagueSlug, games: [] };
        if (p.starter) a.position = p.position;
        a.games.push({
          id: m.id, date: q.match.date, league: m.leagueSlug, opponent: opp, rating: p.rating, teamId: l.team.id,
          goals: p.goals, assists: p.stats.goalAssists ?? 0, result: mine > theirs ? 'W' : mine < theirs ? 'L' : 'D',
        });
        players.set(p.id, a);
      }
    }
  });

  // Last n appearances; require all n (the window is each team's last n, so: played every one).
  const cands = [...players.values()]
    .map((a) => ({ ...a, games: a.games.sort((x, y) => y.date.localeCompare(x.date)).slice(0, n) }))
    .filter((a) => a.games.length === n)
    .sort((x, y) => avg(y.games.map((g) => g.rating)) - avg(x.games.map((g) => g.rating)))
    .slice(0, 40);

  // Pass 2: full DiDa ratings for the candidates.
  const refined = await pool(cands, 6, async (c) => {
    const games = await Promise.all(c.games.map(async (g) => {
      const line = await getPlayerMatchLine('soccer', g.league, g.id, c.id).catch(() => undefined);
      return line?.player.rating != null ? { ...g, rating: line.player.rating } : g;
    }));
    return { ...c, games };
  });

  const rows: FormRow[] = refined
    .map((c) => ({
      id: c.id, name: c.name, position: c.position, team: c.team, league: c.league,
      leagueName: leagueFromIndex(c.league)?.short ?? c.league,
      avg: Math.round(avg(c.games.map((g) => g.rating)) * 100) / 100,
      games: c.games.map(({ teamId: _t, ...g }) => g),
      goals: c.games.reduce((t, g) => t + g.goals, 0),
      assists: c.games.reduce((t, g) => t + g.assists, 0),
    }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 10);
  const entry = { at: Date.now(), rows };
  memo.set(key, entry);
  try { localStorage.setItem(key, JSON.stringify(entry)); } catch { /* ignore */ }
  return rows;
}
