import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getDayMatches, getLeagues, leagueFromIndex, peekDayMatches } from '../api/espn';
import type { League, Match } from '../api/types';
import { ClubCard } from '../components/ClubCard';
import { Crest } from '../components/Crest';
import { DateStrip } from '../components/DateStrip';
import { Icon } from '../components/Icon';
import { MatchRow } from '../components/MatchRow';
import { Empty, ErrorBox, Loading } from '../components/States';
import { Star } from '../components/Star';
import { pushToast } from '../components/Toasts';
import { isoDay, parseIsoDay, sameDay, startOfDay } from '../lib/dates';
import { favorites, settings, toggleLeague, ui } from '../lib/store';
import { usePoll } from '../lib/usePoll';
import { DEFAULT_SPORT, sportByKey } from '../sports';

type Filter = 'all' | 'live' | 'following';

interface Group {
  key: string;
  league?: League;
  name: string;
  logo?: string;
  slug: string;
  matches: Match[];
  live: number;
  pinned: boolean;
}

export function Home() {
  const [params, setParams] = useSearchParams();
  const day = parseIsoDay(params.get('d'));
  const filter = (params.get('f') as Filter) || 'all';
  const sport = DEFAULT_SPORT;
  const cfg = sportByKey(sport);
  const fav = favorites.use();
  const { collapsed } = ui.use();
  const { goalAlerts } = settings.use();
  const [leaguesReady, setLeaguesReady] = useState(false);

  useEffect(() => {
    getLeagues(sport).then(() => setLeaguesReady(true)).catch(() => setLeaguesReady(true));
  }, [sport]);

  const isToday = sameDay(day, startOfDay(new Date()));
  const { data, error, loading, refresh, updatedAt } = usePoll(
    () => getDayMatches(sport, day, 10_000),
    [isoDay(day), sport],
    (d) => (d?.some((m) => m.state === 'in') ? 20_000 : isToday ? 60_000 : 300_000),
    peekDayMatches(sport, day)
  );

  // Goal detection: flash rows whose score went up; alert for followed teams.
  const prev = useRef(new Map<string, [string?, string?]>());
  const [flash, setFlash] = useState<Record<string, 'home' | 'away'>>({});
  useEffect(() => {
    if (!data) return;
    const next = new Map<string, [string?, string?]>();
    const flashes: Record<string, 'home' | 'away'> = {};
    const favIds = new Set(favorites.get().teams.map((t) => t.id));
    for (const m of data) {
      next.set(m.id, [m.home.score, m.away.score]);
      const p = prev.current.get(m.id);
      if (!p || m.state !== 'in') continue;
      const side = Number(m.home.score) > Number(p[0] ?? 0) ? 'home' : Number(m.away.score) > Number(p[1] ?? 0) ? 'away' : undefined;
      if (!side) continue;
      flashes[m.id] = side;
      const scorer = m[side].team;
      const followed = favIds.has(m.home.team.id) || favIds.has(m.away.team.id) || favorites.get().matches.includes(m.id);
      if (followed) {
        const body = `${m.home.team.short} ${m.home.score} – ${m.away.score} ${m.away.team.short} (${m.status})`;
        pushToast(`Goal for ${scorer.short}!`, body);
        if (goalAlerts && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(`Goal for ${scorer.short}!`, { body, icon: scorer.logo, tag: m.id });
          } catch {
            /* some mobile browsers only allow SW notifications */
          }
        }
      }
    }
    prev.current = next;
    if (Object.keys(flashes).length) {
      setFlash(flashes);
      const t = window.setTimeout(() => setFlash({}), 4000);
      return () => window.clearTimeout(t);
    }
  }, [data, goalAlerts]);

  const favTeamIds = useMemo(() => new Set(fav.teams.map((t) => t.id)), [fav.teams]);
  const favLeagueSlugs = useMemo(() => new Set(fav.leagues.map((l) => l.slug)), [fav.leagues]);

  const all = data ?? [];
  const liveCount = all.filter((m) => m.state === 'in').length;
  const isFollowedMatch = (m: Match) =>
    favTeamIds.has(m.home.team.id) || favTeamIds.has(m.away.team.id) || fav.matches.includes(m.id);
  const followedMatches = all.filter(isFollowedMatch);

  const groups: Group[] = useMemo(() => {
    let list = all;
    if (filter === 'live') list = list.filter((m) => m.state === 'in');
    if (filter === 'following') list = list.filter((m) => isFollowedMatch(m) || favLeagueSlugs.has(m.leagueSlug));
    const by = new Map<string, Group>();
    for (const m of list) {
      const lg = leagueFromIndex(m.leagueId) ?? leagueFromIndex(m.leagueSlug);
      const key = lg?.slug ?? m.leagueSlug ?? m.leagueId;
      let g = by.get(key);
      if (!g) {
        g = { key, league: lg, name: lg?.name ?? key, logo: lg?.logo, slug: lg?.slug ?? m.leagueSlug, matches: [], live: 0, pinned: favLeagueSlugs.has(key) };
        by.set(key, g);
      }
      g.matches.push(m);
      if (m.state === 'in') g.live++;
    }
    const rank = (g: Group) => {
      const i = cfg.featured.indexOf(g.slug);
      return (g.pinned ? 0 : 1000) + (i === -1 ? 500 : i);
    };
    return [...by.values()].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, filter, favLeagueSlugs, favTeamIds, fav.matches, leaguesReady]);

  const setParam = (k: string, v?: string) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v);
    else p.delete(k);
    setParams(p, { replace: true });
  };
  const toggle = (key: string) => ui.set((s) => ({ collapsed: { ...s.collapsed, [key]: !s.collapsed[key] } }));

  return (
    <>
      <div className="sticky-sub">
        <DateStrip value={day} onChange={(d) => setParam('d', sameDay(d, new Date()) ? undefined : isoDay(d))} />
        <div className="chips">
          <button className={`chip ${filter === 'all' ? 'sel' : ''}`} onClick={() => setParam('f')}>All <span className="chip-n">{all.length || ''}</span></button>
          <button className={`chip live ${filter === 'live' ? 'sel' : ''}`} onClick={() => setParam('f', 'live')}>
            <span className="pulse" /> Live <span className="chip-n">{liveCount || ''}</span>
          </button>
          <button className={`chip ${filter === 'following' ? 'sel' : ''}`} onClick={() => setParam('f', 'following')}>
            <Icon name="star" size={14} /> Following
          </button>
          <span className="updated hide-sm" title="Updates automatically">
            {updatedAt ? `Updated ${new Date(updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}
          </span>
        </div>
      </div>

      {isToday && filter === 'all' && <ClubCard />}

      {error && !data && <ErrorBox error={error} onRetry={refresh} />}
      {loading && !data && <Loading />}

      {data && filter === 'all' && followedMatches.length > 0 && (
        <section className="group group-mine">
          <div className="ghead static">
            <span className="ghead-icon"><Icon name="star" size={16} /></span>
            <span className="gname">Your matches</span>
          </div>
          <div className="glist">
            {followedMatches.map((m) => <MatchRow key={m.id} m={m} flash={flash[m.id]} />)}
          </div>
        </section>
      )}

      {data && groups.length === 0 && (
        <Empty title={filter === 'live' ? 'Nothing live right now' : filter === 'following' ? 'No matches for teams you follow' : 'No matches on this day'}>
          {filter === 'following' ? <>Tap the star on any team, league or match to follow it.</> : filter === 'live' ? <>Check back closer to kick-off, or browse <button className="linkbtn" onClick={() => setParam('f')}>all matches</button>.</> : null}
        </Empty>
      )}

      {groups.map((g) => {
        const isCollapsed = collapsed[g.key] ?? false;
        return (
          <section key={g.key} className="group">
            <div className="ghead">
              <button className="ghead-toggle" onClick={() => toggle(g.key)} aria-expanded={!isCollapsed}>
                <Crest src={g.logo} name={g.name} size={20} />
                <span className="gname">{g.name}</span>
                {g.live > 0 && <span className="glive">{g.live} live</span>}
                <span className="gcount">{g.matches.length}</span>
                <Icon name="chev" size={16} className={`gchev ${isCollapsed ? '' : 'open'}`} />
              </button>
              <Star on={g.pinned} label={g.name} size={18} onClick={() => toggleLeague({ slug: g.slug, name: g.name, logo: g.logo, sport })} />
              <Link to={`/league/${sport}/${g.slug}`} className="gtable" aria-label={`${g.name} table and fixtures`}>Table</Link>
            </div>
            {!isCollapsed && (
              <div className="glist">
                {g.matches.map((m) => <MatchRow key={m.id} m={m} flash={flash[m.id]} />)}
              </div>
            )}
          </section>
        );
      })}
    </>
  );
}
