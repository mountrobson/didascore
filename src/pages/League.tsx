import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getLeagueMatchDays, getLeagues, getStandings, leagueFromIndex } from '../api/espn';
import type { League as L, Match } from '../api/types';
import { Crest } from '../components/Crest';
import { MatchRow } from '../components/MatchRow';
import { StandingsTable } from '../components/StandingsTable';
import { Empty, Loading } from '../components/States';
import { Star } from '../components/Star';
import { fmtLongDate, isoDay } from '../lib/dates';
import { favorites, toggleLeague } from '../lib/store';
import { usePoll } from '../lib/usePoll';

function groupByDay(ms: Match[]) {
  const out = new Map<string, Match[]>();
  for (const m of ms) {
    const k = isoDay(new Date(m.date));
    out.set(k, [...(out.get(k) ?? []), m]);
  }
  return [...out.entries()];
}

export function LeaguePage() {
  const { sport = 'soccer', slug = 'eng.1' } = useParams();
  const [league, setLeague] = useState<L | undefined>(leagueFromIndex(slug));
  const [tab, setTab] = useState<'table' | 'fixtures' | 'results'>('table');
  const fav = favorites.use();

  useEffect(() => {
    if (!league) getLeagues(sport).then(() => setLeague(leagueFromIndex(slug))).catch(() => undefined);
  }, [slug, sport, league]);

  const table = usePoll(() => getStandings(sport, slug), [sport, slug], () => 120_000);
  const upcoming = usePoll(
    () => getLeagueMatchDays(sport, slug, 'next', 4),
    [sport, slug],
    (d) => (d?.some((m) => m.state === 'in') ? 20_000 : 120_000)
  );
  const past = usePoll(() => getLeagueMatchDays(sport, slug, 'prev', 4), [sport, slug], () => 0);

  const hasTable = !!table.data?.length;
  useEffect(() => {
    if (!table.loading && !hasTable) setTab('fixtures');
  }, [table.loading, hasTable]);

  const name = league?.name ?? slug;
  const fixtures = (upcoming.data ?? []).filter((m) => m.state !== 'post');
  const results = (past.data ?? []).filter((m) => m.state === 'post').reverse();
  const following = fav.leagues.some((l) => l.slug === slug);

  return (
    <div>
      <div className="page-head">
        <Crest src={league?.logo} name={name} size={40} />
        <div className="page-title">
          <h1>{name}</h1>
          <span className="muted">{league?.short !== name ? league?.short : ''}</span>
        </div>
        <Star on={following} label={name} onClick={() => toggleLeague({ slug, name, logo: league?.logo, sport })} />
      </div>
      <div className="tabs" role="tablist">
        {hasTable && <button role="tab" aria-selected={tab === 'table'} className={`tab ${tab === 'table' ? 'sel' : ''}`} onClick={() => setTab('table')}>Table</button>}
        <button role="tab" aria-selected={tab === 'fixtures'} className={`tab ${tab === 'fixtures' ? 'sel' : ''}`} onClick={() => setTab('fixtures')}>Fixtures</button>
        <button role="tab" aria-selected={tab === 'results'} className={`tab ${tab === 'results' ? 'sel' : ''}`} onClick={() => setTab('results')}>Results</button>
      </div>
      <div className="tabpanel">
        {tab === 'table' && (table.loading && !table.data ? <Loading /> : hasTable ? <StandingsTable groups={table.data!} sport={sport} league={slug} /> : <Empty title="No table for this competition" />)}
        {tab !== 'table' && (() => {
          const src = tab === 'fixtures' ? upcoming : past;
          const list = tab === 'fixtures' ? fixtures : results;
          if (src.loading && !src.data) return <Loading />;
          if (!list.length) return <Empty title={tab === 'fixtures' ? 'No upcoming fixtures listed' : 'No recent results'} />;
          return groupByDay(list).map(([day, ms]) => (
            <section className="group" key={day}>
              <div className="ghead static"><span className="gname">{fmtLongDate(ms[0].date)}</span></div>
              <div className="glist">{ms.map((m) => <MatchRow key={m.id} m={m} />)}</div>
            </section>
          ));
        })()}
      </div>
    </div>
  );
}
