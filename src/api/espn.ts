/* ESPN public JSON adapter.
 * Endpoints are unauthenticated and CORS-open, but unofficial: no SLA, shapes may change.
 * Everything raw is typed `any` here on purpose and mapped into ./types right away. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { getJSON, peekJSON } from './http';
import { espnDatesForLocalDay, etYmd, isoDay } from '../lib/dates';
import { sportByKey } from '../sports';
import type {
  Incident, League, Lineup, LineupPlayer, Match, MatchDetail, MiniResult, Side, StandingGroup, StatPair, Team, TeamSchedule,
} from './types';

const SITE = 'https://site.api.espn.com/apis/site/v2/sports';
const V2 = 'https://site.api.espn.com/apis/v2/sports';

// ---------- leagues ----------

let leagueIndex: Map<string, League> | undefined; // keyed by id AND slug

export async function getLeagues(sport = 'soccer'): Promise<League[]> {
  const s = sportByKey(sport);
  const raw = await getJSON<any>(`https://site.api.espn.com/apis/site/v2/leagues/dropdown?sport=${s.espn}&limit=500`, 6 * 3600_000);
  const list: League[] = (raw.leagues ?? []).map(mapLeague);
  leagueIndex = new Map();
  for (const l of list) {
    leagueIndex.set(l.id, l);
    leagueIndex.set(l.slug, l);
  }
  return list;
}

export const leagueFromIndex = (idOrSlug: string) => leagueIndex?.get(idOrSlug);

function mapLeague(l: any): League {
  return {
    id: String(l.id),
    slug: l.slug,
    name: l.name,
    short: l.shortName || l.abbreviation || l.name,
    logo: l.logos?.[0]?.href,
    hasStandings: l.hasStandings ?? l.season?.type?.hasStandings ?? true,
  };
}

// ---------- matches ----------

function mapTeam(t: any): Team {
  return {
    id: String(t?.id ?? ''),
    name: t?.displayName || t?.name || 'TBD',
    short: t?.shortDisplayName || t?.displayName || 'TBD',
    abbr: t?.abbreviation || (t?.displayName || 'TBD').slice(0, 3).toUpperCase(),
    logo: t?.logo || t?.logos?.[0]?.href,
    color: t?.color ? `#${t.color}` : undefined,
    alt: t?.alternateColor ? `#${t.alternateColor}` : undefined,
  };
}

const scoreText = (s: any): string | undefined =>
  s == null ? undefined : typeof s === 'object' ? (s.displayValue ?? (s.value != null ? String(s.value) : undefined)) : String(s);

function statusOf(st: any, date: string, sport: string) {
  const t = st?.type ?? {};
  const name: string = t.name ?? '';
  const state = (t.state ?? 'pre') as Match['state'];
  const cancelled = /POSTPONED|CANCELED|CANCELLED|ABANDONED|SUSPENDED|FORFEIT/.test(name);
  let status: string;
  if (/POSTPONED/.test(name)) status = 'Postp.';
  else if (/CANCEL/.test(name)) status = 'Canc.';
  else if (/ABANDONED/.test(name)) status = 'Aband.';
  else if (/SUSPENDED/.test(name)) status = 'Susp.';
  else if (state === 'in') {
    if (/HALFTIME/.test(name)) status = 'HT';
    else if (sport === 'soccer') status = st.displayClock || t.shortDetail || 'Live';
    else status = t.shortDetail || 'Live';
  } else if (state === 'post') status = t.shortDetail || 'FT';
  else status = ''; // UI renders kick-off time
  return { state, status, statusLong: t.description || t.detail || '', cancelled, date };
}

function mapDetailsToGoals(details: any[] | undefined, homeId: string): Incident[] {
  return (details ?? [])
    .filter((d) => d.scoringPlay || d.redCard)
    .map((d) => ({
      minute: d.clock?.displayValue ?? '',
      kind: d.redCard ? 'red' : d.ownGoal ? 'own-goal' : d.penaltyKick ? 'penalty-goal' : 'goal',
      side: String(d.team?.id) === homeId ? 'home' : 'away',
      player: d.athletesInvolved?.[0]?.shortName || d.athletesInvolved?.[0]?.displayName,
      text: d.type?.text ?? '',
    })) as Incident[];
}

export function mapEvent(e: any, sport: string, leagueSlugHint?: string): Match {
  const c = e.competitions?.[0] ?? {};
  const comps: any[] = c.competitors ?? [];
  const h = comps.find((x) => x.homeAway === 'home') ?? comps[0] ?? {};
  const a = comps.find((x) => x.homeAway === 'away') ?? comps[1] ?? {};
  const homeId = String(h.team?.id ?? h.id ?? '');
  const goals = mapDetailsToGoals(c.details, homeId);
  const reds = (side: 'home' | 'away') => goals.filter((g) => g.kind === 'red' && g.side === side).length;
  const side = (x: any, s: 'home' | 'away'): Side => ({
    team: mapTeam(x.team),
    score: scoreText(x.score),
    winner: x.winner,
    redCards: reds(s),
    shootout: x.shootoutScore ?? undefined,
  });
  const leagueId = e.league?.id ? String(e.league.id) : (e.uid?.match(/l:(\d+)/) ?? [])[1] ?? '';
  const slug = e.league?.slug ?? (leagueSlugHint && leagueSlugHint !== 'all' ? leagueSlugHint : leagueFromIndex(leagueId)?.slug ?? 'all');
  const st = statusOf(c.status ?? e.status, e.date, sport);
  return {
    id: String(e.id),
    sport,
    leagueId,
    leagueSlug: slug,
    date: e.date,
    state: st.state,
    status: st.status,
    statusLong: st.statusLong,
    cancelled: st.cancelled,
    home: side(h, 'home'),
    away: side(a, 'away'),
    venue: c.venue?.fullName ?? e.venue?.displayName,
    note: c.notes?.[0]?.headline || c.altGameNote || undefined,
    goals: goals.filter((g) => g.kind !== 'red'),
  };
}

const sbUrl = (sport: string, league: string, date: string) =>
  `${SITE}/${sportByKey(sport).espn}/${league}/scoreboard?dates=${date}&limit=1000`;

/** All matches on a local calendar day, across every league the provider covers. */
export async function getDayMatches(sport: string, day: Date, ttl = 15_000): Promise<Match[]> {
  const s = sportByKey(sport);
  if (!leagueIndex) await getLeagues(sport).catch(() => undefined);
  const want = isoDay(day);
  const slugs = s.hasAllScoreboard ? ['all'] : s.featured;
  // ESPN rejects date ranges, so fetch each Eastern-time date that overlaps the local day.
  const jobs = slugs.flatMap((slug) => espnDatesForLocalDay(day).map((d) => ({ slug, d })));
  const raws = await Promise.all(
    jobs.map(({ slug, d }) => getJSON<any>(sbUrl(sport, slug, d), ttl).then((r) => ({ slug, r })).catch(() => ({ slug, r: { events: [] } })))
  );
  if (raws.every((x) => !x.r.events?.length) && !navigator.onLine) throw new Error('You are offline.');
  const seen = new Set<string>();
  const out: Match[] = [];
  for (const { slug, r } of raws) {
    for (const e of r.events ?? []) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      const m = mapEvent(e, sport, slug);
      if (isoDay(new Date(m.date)) === want) out.push(m);
    }
  }
  return out.sort((x, y) => x.date.localeCompare(y.date));
}

export function peekDayMatches(sport: string, day: Date): Match[] | undefined {
  const s = sportByKey(sport);
  if (!s.hasAllScoreboard) return undefined;
  const raws = espnDatesForLocalDay(day).map((d) => peekJSON<any>(sbUrl(sport, 'all', d)));
  if (raws.some((r) => !r)) return undefined;
  const want = isoDay(day);
  const seen = new Set<string>();
  return raws
    .flatMap((r) => r.events ?? [])
    .filter((e: any) => (seen.has(e.id) ? false : (seen.add(e.id), true)))
    .map((e: any) => mapEvent(e, sport))
    .filter((m: Match) => isoDay(new Date(m.date)) === want)
    .sort((x: Match, y: Match) => x.date.localeCompare(y.date));
}

/** Match days of a league's season, from the scoreboard calendar. */
async function getLeagueCalendar(sport: string, slug: string): Promise<string[]> {
  const r = await getJSON<any>(`${SITE}/${sportByKey(sport).espn}/${slug}/scoreboard`, 600_000);
  const cal: any[] = r.leagues?.[0]?.calendar ?? [];
  // Day calendars are ISO strings; some cups use {entries:[{startDate}]} blocks.
  const days = cal.flatMap((c) => (typeof c === 'string' ? [c] : (c.entries ?? []).map((e: any) => e.startDate)));
  return [...new Set(days.filter(Boolean).map((d: string) => etYmd(new Date(d))))].sort();
}

/** A league's next (or previous) N match days. ESPN has no range queries, so this fetches one request per day. */
export async function getLeagueMatchDays(sport: string, slug: string, dir: 'next' | 'prev', n = 4, ttl = 30_000): Promise<Match[]> {
  const today = etYmd(new Date());
  const cal = await getLeagueCalendar(sport, slug).catch(() => [] as string[]);
  let days = dir === 'next' ? cal.filter((d) => d >= today).slice(0, n) : cal.filter((d) => d <= today).slice(-n);
  if (!days.length) days = [today];
  const raws = await Promise.all(days.map((d) => getJSON<any>(sbUrl(sport, slug, d), ttl).catch(() => ({ events: [] }))));
  const seen = new Set<string>();
  return raws
    .flatMap((r) => r.events ?? [])
    .filter((e: any) => (seen.has(e.id) ? false : (seen.add(e.id), true)))
    .map((e: any) => mapEvent(e, sport, slug))
    .sort((x: Match, y: Match) => x.date.localeCompare(y.date));
}

// ---------- standings ----------

export async function getStandings(sport: string, slug: string): Promise<StandingGroup[]> {
  const r = await getJSON<any>(`${V2}/${sportByKey(sport).espn}/${slug}/standings`, 120_000);
  const groups: any[] = r.children?.length ? r.children : r.standings ? [{ name: r.name, standings: r.standings }] : [];
  return groups
    .map((g) => ({
      name: g.name ?? '',
      rows: (g.standings?.entries ?? []).map((en: any, i: number) => {
        const st: Record<string, number> = {};
        for (const x of en.stats ?? []) st[x.name] = Number(x.value ?? 0);
        return {
          rank: st.rank || en.note?.rank || i + 1,
          team: mapTeam(en.team),
          played: st.gamesPlayed ?? 0,
          won: st.wins ?? 0,
          drawn: st.ties ?? 0,
          lost: st.losses ?? 0,
          gf: st.pointsFor ?? 0,
          ga: st.pointsAgainst ?? 0,
          gd: st.pointDifferential ?? 0,
          points: st.points ?? 0,
          noteColor: en.note?.color,
          note: en.note?.description,
        };
      }).sort((x: { rank: number }, y: { rank: number }) => x.rank - y.rank),
    }))
    .filter((g) => g.rows.length);
}

// ---------- match detail ----------

const STAT_DEFS: { key: string; label: string; share?: boolean; pct?: boolean }[] = [
  { key: 'possessionPct', label: 'Ball possession', share: true },
  { key: 'totalShots', label: 'Total shots' },
  { key: 'shotsOnTarget', label: 'Shots on target' },
  { key: 'blockedShots', label: 'Blocked shots' },
  { key: 'wonCorners', label: 'Corner kicks' },
  { key: 'offsides', label: 'Offsides' },
  { key: 'foulsCommitted', label: 'Fouls' },
  { key: 'yellowCards', label: 'Yellow cards' },
  { key: 'redCards', label: 'Red cards' },
  { key: 'saves', label: 'Goalkeeper saves' },
  { key: 'totalPasses', label: 'Passes' },
  { key: 'accuratePasses', label: 'Accurate passes' },
  { key: 'passPct', label: 'Pass accuracy', pct: true },
  { key: 'totalCrosses', label: 'Crosses' },
  { key: 'totalLongBalls', label: 'Long balls' },
  { key: 'totalTackles', label: 'Tackles' },
  { key: 'interceptions', label: 'Interceptions' },
  { key: 'effectiveClearance', label: 'Clearances' },
];

function mapStats(box: any, homeId: string): StatPair[] {
  const teams: any[] = box?.teams ?? [];
  const h = teams.find((t) => String(t.team?.id) === homeId) ?? teams[0];
  const a = teams.find((t) => t !== h);
  if (!h || !a) return [];
  const get = (t: any, k: string) => t.statistics?.find((s: any) => s.name === k);
  const out: StatPair[] = [];
  for (const d of STAT_DEFS) {
    const hs = get(h, d.key);
    const as = get(a, d.key);
    if (!hs || !as) continue;
    let hv = Number(hs.displayValue ?? hs.value ?? 0);
    let av = Number(as.displayValue ?? as.value ?? 0);
    if (Number.isNaN(hv) || Number.isNaN(av)) continue;
    let ht = String(hs.displayValue);
    let at = String(as.displayValue);
    if (d.pct) {
      hv = Math.round(hv * 100);
      av = Math.round(av * 100);
      ht = `${hv}%`;
      at = `${av}%`;
    } else if (d.share) {
      ht = `${Math.round(hv)}%`;
      at = `${Math.round(av)}%`;
    }
    if (hv === 0 && av === 0 && d.key !== 'redCards' && d.key !== 'yellowCards') continue;
    out.push({ key: d.key, label: d.label, home: hv, away: av, homeText: ht, awayText: at, share: d.share });
  }
  return out;
}

function incidentKind(k: any): Incident['kind'] {
  const t: string = (k.type?.type || k.type?.text || '').toLowerCase();
  if (k.scoringPlay) {
    if (t.includes('own')) return 'own-goal';
    if (t.includes('penalty')) return 'penalty-goal';
    return 'goal';
  }
  if (t.includes('penalty') && (t.includes('miss') || t.includes('saved'))) return 'penalty-miss';
  if (t.includes('red') || t.includes('second-yellow') || t.includes('yellow-red')) return 'red';
  if (t.includes('yellow')) return 'yellow';
  if (t.includes('sub')) return 'sub';
  if (t.includes('var')) return 'var';
  if (t.includes('delay') || t.includes('kickoff') || t.includes('start')) return 'other';
  if (t.includes('half') || t.includes('end') || t.includes('full') || t.includes('extra')) return 'period';
  return 'other';
}

function mapIncidents(keyEvents: any[] | undefined, homeId: string): Incident[] {
  return (keyEvents ?? [])
    .map((k) => {
      const kind = incidentKind(k);
      const parts: any[] = k.participants ?? [];
      return {
        minute: k.clock?.displayValue ?? '',
        kind,
        side: k.team?.id ? (String(k.team.id) === homeId ? 'home' : 'away') : undefined,
        player: parts[0]?.athlete?.displayName,
        secondary: parts[1]?.athlete?.displayName,
        text: k.shortText || k.text || k.type?.text || '',
      } as Incident;
    })
    .filter((i) => i.kind !== 'other');
}

function mapLineups(rosters: any[] | undefined): Lineup[] {
  return (rosters ?? []).map((r) => ({
    side: r.homeAway === 'away' ? 'away' : 'home',
    team: mapTeam(r.team),
    formation: r.formation,
    players: (r.roster ?? []).map((p: any): LineupPlayer => {
      const st: Record<string, number> = {};
      for (const s of p.stats ?? []) st[s.name] = Number(s.value ?? 0);
      return {
        id: String(p.athlete?.id ?? p.jersey),
        name: p.athlete?.displayName ?? '',
        short: p.athlete?.lastName || p.athlete?.shortName || p.athlete?.displayName || '',
        jersey: p.jersey,
        position: p.position?.abbreviation,
        starter: !!p.starter,
        formationPlace: p.formationPlace != null ? Number(p.formationPlace) : undefined,
        subbedIn: !!(p.subbedIn && (p.subbedIn === true || p.subbedIn.didSub)),
        subbedOut: !!(p.subbedOut && (p.subbedOut === true || p.subbedOut.didSub)),
        goals: st.totalGoals ?? 0,
        yellow: (st.yellowCards ?? 0) > 0,
        red: (st.redCards ?? 0) > 0,
      };
    }),
  }));
}

function mapMini(ev: any, teamId: string): MiniResult {
  const res = ev.gameResult as MiniResult['result'];
  return {
    id: String(ev.id),
    date: ev.gameDate,
    opponent: mapTeam(ev.opponent),
    homeAway: String(ev.homeTeamId) === teamId ? 'home' : 'away',
    score: ev.score,
    result: res === 'W' || res === 'D' || res === 'L' ? res : undefined,
    league: ev.leagueName || ev.leagueAbbreviation,
  };
}

export async function getMatchDetail(sport: string, leagueSlug: string, id: string, ttl = 10_000): Promise<MatchDetail> {
  const slug = leagueSlug || 'all';
  const s = await getJSON<any>(`${SITE}/${sportByKey(sport).espn}/${slug}/summary?event=${id}`, ttl);
  const comp = s.header?.competitions?.[0] ?? {};
  const lg = s.header?.league ?? {};
  const ev = { id, uid: s.header?.uid ?? `l:${lg.id}`, date: comp.date, status: comp.status, competitions: [{ ...comp, venue: s.gameInfo?.venue, details: comp.details }] };
  const match = mapEvent(ev, sport, lg.slug ?? slug);
  const homeId = match.home.team.id;
  const incidents = mapIncidents(s.keyEvents, homeId);
  // Prefer the richer keyEvents goal list for the header scorers.
  const goalKinds = new Set(['goal', 'own-goal', 'penalty-goal']);
  const keyGoals = incidents.filter((i) => goalKinds.has(i.kind));
  if (keyGoals.length) match.goals = keyGoals;
  match.home.redCards = incidents.filter((i) => i.kind === 'red' && i.side === 'home').length || match.home.redCards;
  match.away.redCards = incidents.filter((i) => i.kind === 'red' && i.side === 'away').length || match.away.redCards;
  if (s.gameInfo?.venue?.fullName) match.venue = s.gameInfo.venue.fullName + (s.gameInfo.venue.address?.city ? `, ${s.gameInfo.venue.address.city}` : '');

  const form = (s.lastFiveGames ?? []).map((f: any) => {
    const team = mapTeam(f.team);
    return { side: team.id === homeId ? 'home' : 'away', team, games: (f.events ?? []).map((e: any) => mapMini(e, team.id)) };
  });
  const h2hRaw = s.headToHeadGames?.[0];
  const h2h = h2hRaw ? (h2hRaw.events ?? []).map((e: any) => mapMini(e, String(h2hRaw.team?.id))) : [];
  const ref = (s.gameInfo?.officials ?? []).find((o: any) => /referee/i.test(o.position?.name ?? o.position?.displayName ?? ''));

  return {
    match,
    league: { id: String(lg.id ?? ''), slug: lg.slug ?? slug, name: lg.name ?? '', short: lg.shortName || lg.abbreviation || lg.name || '', logo: lg.logos?.[0]?.href ?? leagueFromIndex(String(lg.id))?.logo, hasStandings: true },
    incidents,
    stats: mapStats(s.boxscore, homeId),
    lineups: mapLineups(s.rosters).sort((x, y) => (x.side === y.side ? 0 : x.side === 'home' ? -1 : 1)),
    attendance: s.gameInfo?.attendance || undefined,
    referee: ref?.displayName || ref?.fullName,
    form,
    h2h,
  };
}

// ---------- teams ----------

const ordinal = (n: number) => `${n}${['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) || n % 10 > 3 ? 0 : n % 10]}`;

// Note: ESPN's /teams/{id} and /teams endpoints send no CORS header, so a browser app can't use them.
// Team name, crest and table position come from the schedule and standings feeds instead.
export async function getTeamSchedule(sport: string, leagueSlug: string, teamId: string): Promise<TeamSchedule> {
  const base = `${SITE}/${sportByKey(sport).espn}/${leagueSlug}/teams/${teamId}`;
  if (!leagueIndex) await getLeagues(sport).catch(() => undefined);
  const [past, next, table] = await Promise.all([
    getJSON<any>(`${base}/schedule`, 60_000).catch(() => ({ events: [] })),
    getJSON<any>(`${base}/schedule?fixture=true`, 60_000).catch(() => ({ events: [] })),
    getStandings(sport, leagueSlug).catch(() => [] as StandingGroup[]),
  ]);
  const row = table.flatMap((g) => g.rows).find((r) => r.team.id === teamId);
  const raw = past.team ?? next.team;
  const team: Team = raw ? { ...mapTeam(raw), logo: mapTeam(raw).logo ?? row?.team.logo } : row?.team ?? mapTeam({ id: teamId });
  const lg = leagueFromIndex(leagueSlug);
  const standingSummary = row ? `${ordinal(row.rank)} in ${lg?.short ?? leagueSlug} · ${row.points} pts` : undefined;
  const mapAll = (r: any) => (r.events ?? []).map((e: any) => mapEvent(e, sport));
  const results = mapAll(past).filter((m: Match) => m.state === 'post').sort((a: Match, b: Match) => b.date.localeCompare(a.date));
  const upcoming = mapAll(next).filter((m: Match) => m.state !== 'post').sort((a: Match, b: Match) => a.date.localeCompare(b.date));
  return { team, standingSummary, upcoming, results };
}

/** Teams of a league, taken from its table (the /teams endpoint has no CORS). */
export async function getLeagueTeams(sport: string, slug: string): Promise<Team[]> {
  const groups = await getStandings(sport, slug);
  return groups.flatMap((g) => g.rows.map((r) => r.team));
}
