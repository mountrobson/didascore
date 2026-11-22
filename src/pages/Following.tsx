import { Link } from 'react-router-dom';
import { getTeamSchedule } from '../api/espn';
import { Crest } from '../components/Crest';
import { MatchRow } from '../components/MatchRow';
import { Empty } from '../components/States';
import { Star } from '../components/Star';
import { favorites, toggleLeague, toggleTeam, type FavTeam } from '../lib/store';
import { usePoll } from '../lib/usePoll';

function TeamCard({ t }: { t: FavTeam }) {
  const { data } = usePoll(() => getTeamSchedule(t.sport, t.league, t.id), [t.id, t.league], (d) => (d?.upcoming[0]?.state === 'in' ? 20_000 : 300_000));
  const next = data?.upcoming[0];
  const last = data?.results[0];
  return (
    <section className="group">
      <div className="ghead">
        <Link to={`/team/${t.sport}/${t.league}/${t.id}`} className="ghead-toggle">
          <Crest src={t.logo} name={t.name} size={22} />
          <span className="gname">{t.name}</span>
          {data?.standingSummary && <span className="gcount">{data.standingSummary}</span>}
        </Link>
        <Star on label={t.name} size={18} onClick={() => toggleTeam(t)} />
      </div>
      <div className="glist">
        {last && <MatchRow m={last} showDate />}
        {next && <MatchRow m={next} showDate />}
        {!data && <div className="skeleton" />}
      </div>
    </section>
  );
}

export function Following() {
  const fav = favorites.use();
  if (!fav.teams.length && !fav.leagues.length) {
    return (
      <Empty title="Follow your teams">
        Tap the <span className="inline-star">★</span> next to any team, league or match. Followed teams float to the top of your scores, and you get a goal alert while the app is open.
        <div><Link className="btn" to="/leagues">Find teams and leagues</Link></div>
      </Empty>
    );
  }
  return (
    <div>
      {fav.teams.length > 0 && <h2 className="section-title">Teams</h2>}
      {fav.teams.map((t) => <TeamCard key={t.id} t={t} />)}
      {fav.leagues.length > 0 && <h2 className="section-title">Competitions</h2>}
      <div className="list-card">
        {fav.leagues.map((l) => (
          <div className="list-row" key={l.slug}>
            <Link to={`/league/${l.sport}/${l.slug}`} className="list-link"><Crest src={l.logo} name={l.name} size={22} /><span>{l.name}</span></Link>
            <Star on label={l.name} size={18} onClick={() => toggleLeague(l)} />
          </div>
        ))}
      </div>
    </div>
  );
}
