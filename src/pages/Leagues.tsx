import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getLeagues, getLeagueTeams } from '../api/espn';
import type { League, Team } from '../api/types';
import { Crest } from '../components/Crest';
import { Icon } from '../components/Icon';
import { Loading } from '../components/States';
import { Star } from '../components/Star';
import { favorites, toggleLeague, toggleTeam } from '../lib/store';
import { DEFAULT_SPORT, sportByKey } from '../sports';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// Team search covers the clubs in these competitions (loaded on first search).
const TEAM_SEARCH_LEAGUES = ['eng.1', 'eng.2', 'esp.1', 'ger.1', 'ita.1', 'fra.1', 'ned.1', 'por.1', 'usa.1', 'sco.1', 'tur.1', 'bel.1', 'mex.1', 'bra.1', 'arg.1', 'ksa.1'];

export function Leagues() {
  const sport = DEFAULT_SPORT;
  const cfg = sportByKey(sport);
  const [leagues, setLeagues] = useState<League[]>();
  const [q, setQ] = useState('');
  const [teams, setTeams] = useState<(Team & { league: string })[]>();
  const fav = favorites.use();

  useEffect(() => {
    getLeagues(sport).then(setLeagues).catch(() => setLeagues([]));
  }, [sport]);

  useEffect(() => {
    if (q.length < 2 || teams) return;
    Promise.all(TEAM_SEARCH_LEAGUES.map((slug) => getLeagueTeams(sport, slug).then((ts) => ts.map((t) => ({ ...t, league: slug }))).catch(() => [])))
      .then((all) => {
        const seen = new Set<string>();
        setTeams(all.flat().filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true))));
      });
  }, [q, teams, sport]);

  const nq = norm(q.trim());
  const popular = useMemo(() => cfg.featured.map((s) => leagues?.find((l) => l.slug === s)).filter(Boolean) as League[], [leagues, cfg]);
  const shownLeagues = nq ? (leagues ?? []).filter((l) => norm(`${l.name} ${l.short} ${l.slug}`).includes(nq)) : [];
  const shownTeams = nq.length >= 2 ? (teams ?? []).filter((t) => norm(`${t.name} ${t.short} ${t.abbr}`).includes(nq)).slice(0, 30) : [];

  const LeagueRow = ({ l }: { l: League }) => (
    <div className="list-row">
      <Link to={`/league/${sport}/${l.slug}`} className="list-link"><Crest src={l.logo} name={l.name} size={22} /><span>{l.name}</span></Link>
      <Star on={fav.leagues.some((x) => x.slug === l.slug)} label={l.name} size={18} onClick={() => toggleLeague({ slug: l.slug, name: l.name, logo: l.logo, sport })} />
    </div>
  );

  return (
    <div>
      <label className="search">
        <Icon name="search" size={18} />
        <input autoFocus={false} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search teams and competitions" aria-label="Search teams and competitions" type="search" />
        {q && <button className="linkbtn" onClick={() => setQ('')} aria-label="Clear"><Icon name="close" size={16} /></button>}
      </label>
      {!leagues && <Loading />}
      {nq && (
        <>
          {nq.length >= 2 && <h2 className="section-title">Teams</h2>}
          {nq.length >= 2 && !teams && <div className="muted pad">Searching clubs…</div>}
          {shownTeams.length > 0 && (
            <div className="list-card">
              {shownTeams.map((t) => (
                <div className="list-row" key={t.id}>
                  <Link to={`/team/${sport}/${t.league}/${t.id}`} className="list-link"><Crest src={t.logo} name={t.name} size={22} /><span>{t.name}</span></Link>
                  <Star on={fav.teams.some((x) => x.id === t.id)} label={t.name} size={18} onClick={() => toggleTeam({ id: t.id, name: t.name, logo: t.logo, league: t.league, sport })} />
                </div>
              ))}
            </div>
          )}
          {teams && nq.length >= 2 && !shownTeams.length && <div className="muted pad">No clubs match “{q}”.</div>}
          <h2 className="section-title">Competitions</h2>
          <div className="list-card">{shownLeagues.length ? shownLeagues.map((l) => <LeagueRow key={l.slug} l={l} />) : <div className="muted pad">No competitions match.</div>}</div>
        </>
      )}
      {!nq && leagues && (
        <>
          <h2 className="section-title">Popular</h2>
          <div className="list-card">{popular.map((l) => <LeagueRow key={l.slug} l={l} />)}</div>
          <h2 className="section-title">All competitions ({leagues.length})</h2>
          <div className="list-card">{[...leagues].sort((a, b) => a.name.localeCompare(b.name)).map((l) => <LeagueRow key={l.slug} l={l} />)}</div>
        </>
      )}
    </div>
  );
}
