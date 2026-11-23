import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getPlayer, getPlayerGameLog, getPlayerInMatch, getPlayerSeasonDetail, type PlayerGame, type PlayerProfile } from '../api/players';
import { leagueFromIndex, getLeagues } from '../api/espn';
import type { LineupPlayer } from '../api/types';
import { Crest } from '../components/Crest';
import { Avatar } from '../components/Avatar';
import { Empty, ErrorBox, Loading } from '../components/States';
import { fmtShortDate, fmtTime } from '../lib/dates';
import { ratingBand } from '../lib/rating';
import { settings } from '../lib/store';
import { usePoll } from '../lib/usePoll';


const pct = (v?: number) => (v == null ? '–' : `${Math.round(v * 100)}%`);
const r1 = (v: number) => Math.round(v * 10) / 10;

/** DiDa ratings for a list of games, filled in as they load. */
function useRatings(playerId: string, games: PlayerGame[]) {
  const [lines, setLines] = useState<Record<string, LineupPlayer | null>>({});
  const key = games.map((g) => g.id).join(',');
  useEffect(() => {
    let alive = true;
    games.forEach((g) => {
      if (lines[g.id] !== undefined) return;
      getPlayerInMatch(playerId, g)
        .then((p) => alive && setLines((s) => ({ ...s, [g.id]: p ?? null })))
        .catch(() => alive && setLines((s) => ({ ...s, [g.id]: null })));
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId, key]);
  return lines;
}

function GameRow({ g, line }: { g: PlayerGame; line?: LineupPlayer | null }) {
  const goals = g.stats.totalGoals ?? 0;
  const assists = g.stats.goalAssists ?? 0;
  const mins = line?.detail?.minutes;
  const benched = line && !line.starter && !line.subbedIn;
  return (
    <Link to={`/match/soccer/${g.league ?? 'all'}/${g.id}`} className="pg-row">
      <span className="pg-date">{fmtShortDate(g.date)}<small>{g.leagueName}</small></span>
      <span className="pg-opp">
        <span className="pg-ha">{g.homeAway === 'home' ? 'vs' : '@'}</span>
        <Crest src={g.opponent.logo} name={g.opponent.name} size={18} />
        <span className="pg-oname">{g.opponent.short}</span>
      </span>
      <span className={`pg-score res-${g.result ?? 'D'}`}>{g.goalsFor ?? '–'}–{g.goalsAgainst ?? '–'}</span>
      <span className="pg-ga">
        {goals > 0 && <span title="Goals">⚽{goals > 1 ? `×${goals}` : ''}</span>}
        {assists > 0 && <span className="muted" title="Assists">A{assists > 1 ? `×${assists}` : ''}</span>}
        {(g.stats.redCards ?? 0) > 0 ? <span className="card red sm" /> : (g.stats.yellowCards ?? 0) > 0 ? <span className="card yellow sm" /> : null}
        {mins != null && <small className="muted">{mins}′</small>}
        {benched && <small className="muted">Bench</small>}
      </span>
      {line === undefined ? <span className="rating none pending">·</span> : line?.rating != null ? <span className={`rating ${ratingBand(line.rating)}`}>{line.rating.toFixed(1)}</span> : <span className="rating none">–</span>}
    </Link>
  );
}

function Matches({ p, comp }: { p: PlayerProfile; comp: string }) {
  const { data: log, loading } = usePoll(
    () => (comp === 'recent' ? Promise.resolve(p.recent) : getPlayerGameLog(p.id, comp)),
    [p.id, comp],
    () => 0
  );
  const games = log ?? [];
  const lines = useRatings(p.id, games.slice(0, 12));
  if (loading && !log) return <Loading />;
  if (!games.length) return <Empty title="No matches this season" />;
  return (
    <div className="glist">
      {games.slice(0, 40).map((g) => <GameRow key={g.id} g={g} line={lines[g.id]} />)}
    </div>
  );
}

type Row = [string, (d: Record<string, number>) => string | null];
const SEASON_ROWS: Row[] = [
  ['Appearances', (d) => (d.appearances != null ? `${d.appearances}${d.subIns ? ` (${d.subIns} off the bench)` : ''}` : null)],
  ['Minutes', (d) => (d.minutes ? d.minutes.toLocaleString() : null)],
  ['Goals', (d) => `${d.totalGoals ?? 0}${d.penaltyKickGoals ? ` (${d.penaltyKickGoals} pen)` : ''}`],
  ['Assists', (d) => String(d.goalAssists ?? 0)],
  ['Minutes per goal + assist', (d) => (d.minutes && (d.totalGoals || d.goalAssists) ? String(Math.round(d.minutes / ((d.totalGoals ?? 0) + (d.goalAssists ?? 0)))) : null)],
  ['Shots (on target)', (d) => (d.totalShots ? `${d.totalShots} (${d.shotsOnTarget ?? 0})` : null)],
  ['Shot accuracy', (d) => (d.totalShots ? pct(d.shotPct) : null)],
  ['Big chances missed', (d) => (d.bigChanceMissed ? String(d.bigChanceMissed) : null)],
  ['Key passes', (d) => (d.shotAssists ? String(d.shotAssists) : null)],
  ['Big chances created', (d) => (d.bigChanceCreated ? String(d.bigChanceCreated) : null)],
  ['Passes completed', (d) => (d.totalPasses ? `${d.accuratePasses ?? 0}/${d.totalPasses} (${pct(d.passPct)})` : null)],
  ['Through balls', (d) => (d.totalThroughBalls ? `${d.accurateThroughBalls ?? 0}/${d.totalThroughBalls}` : null)],
  ['Crosses', (d) => (d.totalCrosses ? `${d.accurateCrosses ?? 0}/${d.totalCrosses}` : null)],
  ['Progressive carries', (d) => (d.progressiveCarries ? String(d.progressiveCarries) : null)],
  ['Touches in the box', (d) => (d.touchesInOppBox ? String(d.touchesInOppBox) : null)],
  ['Touches', (d) => (d.touches ? d.touches.toLocaleString() : null)],
  ['Duels won', (d) => (d.duels ? `${d.duelsWon ?? 0}/${d.duels} (${Math.round(((d.duelsWon ?? 0) / d.duels) * 100)}%)` : null)],
  ['Tackles won', (d) => (d.totalTackles ? `${d.effectiveTackles ?? 0}/${d.totalTackles}` : null)],
  ['Interceptions', (d) => (d.interceptions ? String(d.interceptions) : null)],
  ['Recoveries', (d) => (d.recoveries ? String(d.recoveries) : null)],
  ['Clearances', (d) => (d.effectiveClearance ? String(d.effectiveClearance) : null)],
  ['Blocked shots', (d) => (d.blockedShots ? String(d.blockedShots) : null)],
  ['Fouls committed / won', (d) => (d.foulsCommitted || d.foulsSuffered ? `${d.foulsCommitted ?? 0} / ${d.foulsSuffered ?? 0}` : null)],
  ['Offsides', (d) => (d.offsides ? String(d.offsides) : null)],
  ['Cards', (d) => (d.yellowCards || d.redCards ? `${d.yellowCards ?? 0} yellow${d.redCards ? `, ${d.redCards} red` : ''}` : null)],
];
const GK_ROWS: Row[] = [
  ['Saves', (d) => (d.saves != null ? String(d.saves) : null)],
  ['Goals conceded', (d) => (d.goalsConceded != null ? String(d.goalsConceded) : null)],
  ['Clean sheets', (d) => (d.cleanSheet != null ? String(d.cleanSheet) : null)],
  ['Penalties saved', (d) => (d.penaltyKicksFaced ? `${d.penaltyKicksSaved ?? 0}/${d.penaltyKicksFaced}` : null)],
];

function SeasonDetail({ p, league }: { p: PlayerProfile; league: string }) {
  const { data, loading } = usePoll(() => getPlayerSeasonDetail(p.id, league), [p.id, league], () => 0);
  const [all, setAll] = useState(false);
  if (loading && !data) return <Loading />;
  if (!data) return <Empty title="No detailed stats for this competition" />;
  const rows = (/goalkeeper/i.test(p.position ?? '') ? [...GK_ROWS, ...SEASON_ROWS.slice(0, 2), SEASON_ROWS[10]] : SEASON_ROWS)
    .map(([label, f]) => [label, f(data)] as const)
    .filter(([, v]) => v != null);
  const shown = all ? rows : rows.slice(0, 10);
  return (
    <>
      <dl className="psheet-stats season-stats">
        {shown.map(([label, v]) => <div key={label}><dt>{label}</dt><dd>{v}</dd></div>)}
      </dl>
      {rows.length > shown.length && <button className="chip more-btn" onClick={() => setAll(true)}>Show all {rows.length} stats</button>}
    </>
  );
}

export function PlayerPage() {
  const { id = '', league: leagueParam = 'all' } = useParams();
  const [sp, setSp] = useSearchParams();
  const { h24 } = settings.use();
  const [, setTick] = useState(0);
  useEffect(() => { getLeagues('soccer').then(() => setTick((t) => t + 1)).catch(() => undefined); }, []);
  const { data: p, error, loading, refresh } = usePoll(() => getPlayer(id), [id], () => 600_000);
  const recentLines = useRatings(id, p?.recent ?? []);

  const comps = useMemo(() => (p?.splits ?? []).filter((s) => s.league && (s.stats.starts || s.stats.totalGoals || s.stats.goalAssists || s.stats.totalShots || s.stats.foulsCommitted || s.stats.foulsSuffered)), [p]);
  const statsLeague = sp.get('s') || (leagueParam !== 'all' && comps.some((c) => c.league === leagueParam) ? leagueParam : p?.mainLeague) || comps[0]?.league;
  const comp = sp.get('m') || 'recent';

  if (loading && !p) return <Loading />;
  if (error && !p) return <ErrorBox error={error} onRetry={refresh} />;
  if (!p) return null;

  const rated = Object.values(recentLines).filter((x): x is LineupPlayer => !!x && x.rating != null);
  const form = rated.length ? r1(rated.reduce((t, x) => t + (x.rating ?? 0), 0) / rated.length) : undefined;
  const tot = comps.reduce((a, c) => ({ g: a.g + (c.stats.totalGoals ?? 0), a: a.a + (c.stats.goalAssists ?? 0), s: a.s + (c.stats.starts ?? 0) }), { g: 0, a: 0, s: 0 });
  const set = (k: string, v?: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n, { replace: true }); };
  const lname = (slug: string, fallback: string) => leagueFromIndex(slug)?.short ?? fallback.replace(/^\d{4}(-\d{2})?\s+/, '');

  return (
    <div className="player-page">
      <div className="page-head player-head" style={p.team?.color ? { ['--team' as string]: p.team.color } : undefined}>
        <Avatar id={p.id} name={p.name} birthYear={p.birthYear} crest={p.team?.logo} color={p.team?.color} size={64} />
        <div className="page-title">
          <h1>{p.name}</h1>
          <span className="muted">
            {p.jersey && `#${p.jersey} · `}{p.position}
            {p.team && <> · <Link to={`/team/soccer/${p.mainLeague ?? 'all'}/${p.team.id}`} className="p-team">{p.team.short}</Link></>}
          </span>
          <span className="p-bio muted">
            {p.flag && <img src={p.flag} alt="" className="p-flag" />}
            {[p.nationality, p.age ? `${p.age} yrs` : undefined, p.height].filter(Boolean).join(' · ')}
          </span>
        </div>
      </div>

      <div className="p-kpis">
        <div><b>{tot.g}</b><span>Goals</span></div>
        <div><b>{tot.a}</b><span>Assists</span></div>
        <div><b>{tot.s}</b><span>Starts</span></div>
        <div>{form != null ? <b className={`rating lg ${ratingBand(form)}`}>{form.toFixed(1)}</b> : <b className="muted">–</b>}<span>Form (last {rated.length || 5})</span></div>
      </div>

      {p.next && (
        <Link to={`/match/soccer/${p.next.league}/${p.next.id}`} className="group p-next">
          <span className="muted">Next</span>
          <Crest src={p.next.opponent.logo} name={p.next.opponent.name} size={22} />
          <span className="p-next-name">{p.next.homeAway === 'home' ? 'vs' : '@'} {p.next.opponent.short}</span>
          <span className="muted">{p.next.leagueName} · {fmtShortDate(p.next.date)} {fmtTime(p.next.date, h24)}</span>
        </Link>
      )}

      <section className="group">
        <div className="ghead static"><span className="gname">Matches</span></div>
        <div className="chips pad-y">
          <button className={`chip ${comp === 'recent' ? 'sel' : ''}`} onClick={() => set('m')}>Last 5</button>
          {comps.map((c) => (
            <button key={c.league + c.teamId} className={`chip ${comp === c.league ? 'sel' : ''}`} onClick={() => set('m', c.league)}>{lname(c.league, c.name)}</button>
          ))}
        </div>
        <Matches p={p} comp={comp} />
      </section>

      {comps.length > 0 && (
        <section className="group">
          <div className="ghead static"><span className="gname">This season</span></div>
          <div className="table-scroll">
            <table className="p-splits">
              <thead><tr><th className="c-team">Competition</th><th>ST</th><th>G</th><th>A</th><th>Sh</th><th>SoT</th><th>YC</th></tr></thead>
              <tbody>
                {comps.map((c) => (
                  <tr key={c.league + c.teamId}>
                    <td className="c-team">{lname(c.league, c.name)}{p.team && c.teamId !== p.team.id && <small className="muted"> · intl</small>}</td>
                    <td>{c.stats.starts ?? 0}</td><td><b>{c.stats.totalGoals ?? 0}</b></td><td><b>{c.stats.goalAssists ?? 0}</b></td>
                    <td>{c.stats.totalShots ?? 0}</td><td>{c.stats.shotsOnTarget ?? 0}</td><td>{c.stats.yellowCards ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {statsLeague && (
        <section className="group">
          <div className="ghead static"><span className="gname">Detailed stats</span></div>
          <div className="chips pad-y">
            {comps.map((c) => (
              <button key={c.league + c.teamId} className={`chip ${statsLeague === c.league ? 'sel' : ''}`} onClick={() => set('s', c.league)}>{lname(c.league, c.name)}</button>
            ))}
          </div>
          <div className="pad-x pad-b"><SeasonDetail p={p} league={statsLeague} /></div>
        </section>
      )}

      {p.news.length > 0 && (
        <section className="group">
          <div className="ghead static"><span className="gname">Latest news</span></div>
          <ul className="p-news">
            {p.news.map((n) => (
              <li key={n.headline}>
                <a href={n.href} target="_blank" rel="noopener noreferrer">
                  {n.image && <img src={n.image} alt="" loading="lazy" />}
                  <span>{n.headline}{n.published && <small className="muted">{fmtShortDate(n.published)} · ESPN</small>}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="footnote muted">Player data from ESPN. Form is the average DiDa rating over the last 5 matches; tap a match for the full breakdown.</p>
    </div>
  );
}
