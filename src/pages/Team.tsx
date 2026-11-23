import { playerHref } from '../lib/links';
import { Link, useParams } from 'react-router-dom';
import { getTopScorers } from '../api/scorers';
import { getTeamSchedule } from '../api/espn';
import { Crest } from '../components/Crest';
import { MatchRow } from '../components/MatchRow';
import { Empty, ErrorBox, Loading } from '../components/States';
import { Star } from '../components/Star';
import { club, favorites, toggleTeam } from '../lib/store';
import { usePoll } from '../lib/usePoll';

export function ClubPage() {
  const { team } = club.use();
  return <TeamPage sport={team.sport} league={team.league} id={team.id} />;
}

function ClubScorers({ league, teamId }: { league: string; teamId: string }) {
  const { data } = usePoll(() => getTopScorers(league), [league], () => 600_000);
  const mine = (data ?? []).filter((s) => s.team.id === teamId).slice(0, 8);
  if (!mine.length) return null;
  return (
    <section className="group">
      <div className="ghead static"><span className="gname">Top scorers · {mine[0].leagueName}</span></div>
      <ul className="scorer-list">
        {mine.map((s) => (
          <li key={s.id}><Link to={playerHref(s.id, league)} className="plink">{s.name}</Link><span className="muted">{s.matches != null ? `${s.matches} MP` : ''}</span><strong>{s.goals}</strong></li>
        ))}
      </ul>
    </section>
  );
}

export function TeamPage(props: { sport?: string; league?: string; id?: string }) {
  const p = useParams();
  const sport = props.sport ?? p.sport ?? 'soccer';
  const league = props.league ?? p.league ?? 'eng.1';
  const id = props.id ?? p.id ?? '';
  const { team: myClub } = club.use();
  const fav = favorites.use();
  const { data, error, loading, refresh } = usePoll(
    () => getTeamSchedule(sport, league, id),
    [sport, league, id],
    (d) => (d?.upcoming.some((m) => m.state === 'in') ? 20_000 : 300_000)
  );
  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorBox error={error} onRetry={refresh} />;
  if (!data) return null;
  const t = data.team;
  const on = fav.teams.some((x) => x.id === t.id);
  const form = data.results.slice(0, 5).map((m) => {
    const me = m.home.team.id === t.id ? m.home : m.away;
    const opp = me === m.home ? m.away : m.home;
    const a = Number(me.score), b = Number(opp.score);
    return { id: m.id, r: a > b ? 'W' : a < b ? 'L' : 'D' };
  });
  return (
    <div>
      <div className="page-head team-head" style={t.color ? { ['--team' as string]: t.color } : undefined}>
        <Crest src={t.logo} name={t.name} size={48} />
        <div className="page-title">
          <h1>{t.name}</h1>
          {data.standingSummary && <span className="muted">{data.standingSummary}</span>}
          {form.length > 0 && <div className="form-pills">{form.map((f) => <span key={f.id} className={`res res-${f.r}`}>{f.r}</span>)}</div>}
        </div>
        <Star on={on} label={t.name} onClick={() => toggleTeam({ id: t.id, name: t.name, logo: t.logo, league, sport })} />
      </div>
      {myClub.id !== t.id && (
        <div className="pad">
          <button className="chip" onClick={() => club.set({ team: { id: t.id, name: t.name, logo: t.logo, league, sport } })}>Make {t.short} my club</button>
        </div>
      )}
      <section className="group">
        <div className="ghead static"><span className="gname">Upcoming</span></div>
        <div className="glist">
          {data.upcoming.length ? data.upcoming.slice(0, 10).map((m) => <MatchRow key={m.id} m={m} showDate />) : <Empty title="No upcoming fixtures listed" />}
        </div>
      </section>
      {sport === 'soccer' && <ClubScorers league={league} teamId={t.id} />}
      <section className="group">
        <div className="ghead static"><span className="gname">Results</span></div>
        <div className="glist">
          {data.results.length ? data.results.slice(0, 15).map((m) => <MatchRow key={m.id} m={m} showDate />) : <Empty title="No results yet this season" />}
        </div>
      </section>
    </div>
  );
}
