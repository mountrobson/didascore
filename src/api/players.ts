/* Player profile from ESPN's athlete feeds (CORS-open, unofficial).
 * common/v3 athletes/{id}          bio, team, nationality
 * common/v3 athletes/{id}/overview season splits per competition, last 5 matches, next match, news
 * common/v3 athletes/{id}/gamelog  every match this season in one competition
 * core leagues/{slug}/seasons/{y}/types/1/athletes/{id}/statistics  detailed season stats */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { getJSON } from './http';
import { getPlayerMatchLine, mapTeam } from './espn';
import type { LineupPlayer, Team } from './types';

const ATH = 'https://site.web.api.espn.com/apis/common/v3/sports/soccer/athletes';
const CORE = 'https://sports.core.api.espn.com/v2/sports/soccer/leagues';

export interface PlayerSplit {
  name: string;
  league: string; // slug
  teamId: string;
  stats: Record<string, number>;
}

export interface PlayerGame {
  id: string;
  date: string;
  league?: string; // slug
  leagueName: string;
  opponent: Team;
  homeAway: 'home' | 'away';
  goalsFor?: number;
  goalsAgainst?: number;
  result?: 'W' | 'D' | 'L';
  started?: boolean;
  stats: Record<string, number>;
}

export interface PlayerNews { headline: string; href?: string; image?: string; published?: string }

export interface PlayerNext { id: string; date: string; league: string; leagueName: string; opponent: Team; homeAway: 'home' | 'away' }

export interface PlayerProfile {
  id: string;
  name: string;
  jersey?: string;
  position?: string;
  age?: number;
  dob?: string;
  birthYear?: number;
  height?: string;
  weight?: string;
  nationality?: string;
  flag?: string;
  team?: Team;
  splits: PlayerSplit[];
  recent: PlayerGame[];
  next?: PlayerNext;
  news: PlayerNews[];
  /** Slug of the club's domestic league (best guess), for detailed season stats. */
  mainLeague?: string;
}

const num = (v: any) => (v == null || v === '' || isNaN(Number(v)) ? 0 : Number(v));

/** League slug from an event's links (ESPN only puts it there). */
function slugFromLinks(links: any[] | undefined): string | undefined {
  for (const l of links ?? []) {
    const m = String(l.href ?? '').match(/leagueAbbrev=([a-z0-9._]+)/i);
    if (m) return m[1];
  }
  return undefined;
}

function mapGame(ev: any, names: string[], stats: string[] | undefined, league?: string): PlayerGame {
  const teamId = String(ev.team?.id ?? '');
  const home = String(ev.homeTeamId) === teamId;
  const hs = ev.homeTeamScore, as = ev.awayTeamScore;
  const st: Record<string, number> = {};
  let started: boolean | undefined;
  names.forEach((n, i) => {
    const v = stats?.[i];
    if (n === 'appearances') started = v === 'Started' ? true : v ? false : undefined;
    else st[n] = num(v);
  });
  const r = ev.gameResult;
  return {
    id: String(ev.id),
    date: ev.gameDate,
    league: league ?? slugFromLinks(ev.links),
    leagueName: ev.leagueShortName || ev.leagueName || '',
    opponent: mapTeam(ev.opponent),
    homeAway: home ? 'home' : 'away',
    goalsFor: hs == null ? undefined : num(home ? hs : as),
    goalsAgainst: hs == null ? undefined : num(home ? as : hs),
    result: r === 'W' || r === 'D' || r === 'L' ? r : undefined,
    started,
    stats: st,
  };
}

export async function getPlayer(id: string): Promise<PlayerProfile> {
  const [bio, ov] = await Promise.all([
    getJSON<any>(`${ATH}/${id}`, 3600_000),
    getJSON<any>(`${ATH}/${id}/overview`, 300_000).catch(() => ({})),
  ]);
  const a = bio.athlete ?? bio;
  const team = a.team ? mapTeam({ ...a.team, logo: a.team.logos?.[0]?.href }) : undefined;

  const st = ov.statistics ?? {};
  const splits: PlayerSplit[] = (st.splits ?? []).map((s: any) => {
    const stats: Record<string, number> = {};
    (st.names ?? []).forEach((n: string, i: number) => (stats[n] = num(s.stats?.[i])));
    return { name: s.displayName ?? '', league: s.leagueSlug ?? '', teamId: String(s.teamId ?? ''), stats };
  });

  const gl = ov.gameLog?.statistics?.[0];
  const recent: PlayerGame[] = (gl?.events ?? [])
    .map((e: any) => ov.gameLog.events?.[e.eventId] && mapGame(ov.gameLog.events[e.eventId], gl.names ?? [], e.stats))
    .filter(Boolean);

  const ng = ov.nextGame?.league?.events?.[0];
  let next: PlayerNext | undefined;
  if (ng) {
    const me = (ng.competitors ?? []).find((c: any) => team && String(c.id) === team.id);
    const opp = (ng.competitors ?? []).find((c: any) => c !== me) ?? ng.competitors?.[1];
    next = {
      id: String(ng.id),
      date: ng.date,
      league: ov.nextGame.league.slug,
      leagueName: ov.nextGame.league.shortName || ov.nextGame.league.name || '',
      opponent: mapTeam(opp),
      homeAway: me?.homeAway === 'away' ? 'away' : 'home',
    };
  }

  const domestic = splits.filter((s) => team && s.teamId === team.id && /^[a-z]{3}\.1$/.test(s.league));
  const mainLeague = domestic[0]?.league ?? splits.find((s) => team && s.teamId === team.id)?.league;

  return {
    id: String(a.id ?? id),
    name: a.displayName ?? a.fullName ?? '',
    jersey: a.jersey ?? a.displayJersey?.replace('#', ''),
    position: a.position?.displayName,
    age: a.age,
    dob: a.displayDOB,
    birthYear: Number(String(a.displayDOB ?? '').match(/(\d{4})$/)?.[1]) || undefined,
    height: a.displayHeight,
    weight: a.displayWeight,
    nationality: a.citizenship ?? a.flag?.alt,
    flag: a.flag?.href,
    team,
    splits,
    recent,
    next,
    news: (ov.news ?? []).slice(0, 4).map((n: any) => ({ headline: n.headline, href: n.links?.web?.href, image: n.images?.[0]?.url, published: n.published })),
    mainLeague,
  };
}

/** All of this season's matches in one competition, newest first. */
export async function getPlayerGameLog(id: string, league: string): Promise<PlayerGame[]> {
  const gl = await getJSON<any>(`${ATH}/${id}/gamelog?league=${league}`, 600_000);
  const names: string[] = gl.names ?? [];
  const rows: { eventId: string; stats: string[] }[] = (gl.seasonTypes ?? []).flatMap((s: any) => (s.categories ?? []).flatMap((c: any) => c.events ?? []));
  return rows
    .map((r) => gl.events?.[r.eventId] && mapGame(gl.events[r.eventId], names, r.stats, league))
    .filter(Boolean)
    .sort((x: PlayerGame, y: PlayerGame) => y.date.localeCompare(x.date));
}

/** Detailed season stats in one competition (minutes, passes, chances, dribbles, duels, defending…). */
export async function getPlayerSeasonDetail(id: string, league: string): Promise<Record<string, number> | undefined> {
  const season = seasonYear();
  try {
    const j = await getJSON<any>(`${CORE}/${league}/seasons/${season}/types/1/athletes/${id}/statistics`, 600_000);
    const d: Record<string, number> = {};
    for (const c of j.splits?.categories ?? []) for (const x of c.stats ?? []) d[x.name] = Number(x.value ?? 0);
    return Object.keys(d).length ? d : undefined;
  } catch {
    return undefined;
  }
}

/** European seasons are named by their starting year; they roll over in July. */
export function seasonYear(d = new Date()) {
  return d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
}

/** The player's DiDa rating and match line in one game. */
export async function getPlayerInMatch(playerId: string, g: { id: string; league?: string }): Promise<LineupPlayer | undefined> {
  return (await getPlayerMatchLine('soccer', g.league ?? 'all', g.id, playerId))?.player;
}

// ---------- light bio + photo (for lists) ----------

export interface PlayerBio { age?: number; birthYear?: number; nationality?: string; flag?: string; position?: string }

export async function getPlayerBio(id: string): Promise<PlayerBio> {
  const bio = await getJSON<any>(`${ATH}/${id}`, 24 * 3600_000);
  const a = bio.athlete ?? bio;
  const y = String(a.displayDOB ?? '').match(/(\d{4})$/);
  return {
    age: a.age,
    birthYear: y ? Number(y[1]) : undefined,
    nationality: a.citizenship ?? a.flag?.alt,
    flag: a.flag?.href,
    position: a.position?.abbreviation,
  };
}

/**
 * Player photo from Wikipedia (free, CC-licensed images via the Wikimedia REST API; ESPN has no football headshots).
 * Only accepted when the article is about a footballer born in the same year, so namesakes don't slip through.
 * Results (including misses) are remembered for a week in localStorage.
 */
export async function getPlayerPhoto(id: string, name: string, birthYear?: number): Promise<string | undefined> {
  const key = `dida.photo.${id}`;
  try {
    const c = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (c && Date.now() - c.t < 7 * 86400_000) return c.u || undefined;
  } catch { /* ignore */ }
  const titles = [name, `${name} (footballer)`, ...(birthYear ? [`${name} (footballer, born ${birthYear})`] : [])];
  let url: string | undefined;
  for (const t of titles) {
    try {
      const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(t.replace(/ /g, '_'))}`);
      if (!r.ok) continue;
      const j = await r.json();
      const desc = String(j.description ?? '');
      if (!/football|soccer/i.test(desc)) continue;
      if (birthYear && /born \d{4}/.test(desc) && !desc.includes(String(birthYear))) continue;
      url = j.thumbnail?.source;
      break;
    } catch { /* network */ }
  }
  try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), u: url ?? '' })); } catch { /* ignore */ }
  return url;
}
