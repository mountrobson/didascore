import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getInForm, peekInForm, type FormRow } from '../api/form';
import { getPlayerBio } from '../api/players';
import { Avatar, smallLogo } from '../components/Avatar';
import { Empty, ErrorBox, Loading } from '../components/States';
import { playerHref } from '../lib/links';
import { ratingBand } from '../lib/rating';
import { club, createStore } from '../lib/store';
import { usePoll } from '../lib/usePoll';

const prefs = createStore<{ n: 3 | 5 | 10 }>('dida.topform', { n: 3 });

function Row({ r, rank, mine }: { r: FormRow; rank: number; mine: boolean }) {
  const { data: bio } = usePoll(() => getPlayerBio(r.id), [r.id], () => 0);
  return (
    <tr className={mine ? 'hl' : ''}>
      <td className="c-rank"><span className="rank">{rank}</span></td>
      <td className="c-team c-sticky">
        <Link to={playerHref(r.id, r.league)} className="scorer">
          <Avatar id={r.id} name={r.name} birthYear={bio?.birthYear} crest={r.team.logo} size={36} wait={!bio} />
          <div className="scorer-txt">
            <span className="scorer-name">{r.name}</span>
            <span className="scorer-sub">{r.team.short} · {r.leagueName}</span>
          </div>
        </Link>
      </td>
      <td className="c-nat" title={bio?.nationality}>{bio?.flag ? <img src={smallLogo(bio.flag, 40)} alt={bio.nationality ?? ''} /> : ''}</td>
      <td>{bio?.age ?? ''}</td>
      <td><span className={`rating ${ratingBand(r.avg)}`}>{r.avg.toFixed(2)}</span></td>
      <td>{r.goals}</td>
      <td>{r.assists}</td>
      <td className="c-last3">
        {r.games.map((g) => (
          <Link key={g.id} to={`/match/soccer/${g.league}/${g.id}`} title={`vs ${g.opponent.short}`} className={`rating sm ${ratingBand(g.rating)}`}>{g.rating.toFixed(1)}</Link>
        ))}
      </td>
      <td>{bio?.position ?? r.position ?? ''}</td>
    </tr>
  );
}

export function TopForm() {
  const { n } = prefs.use();
  const { team: myClub } = club.use();
  const [prog, setProg] = useState<[number, number]>();
  const { data, error, loading, refresh } = usePoll(
    () => { setProg(undefined); return getInForm(n, undefined, (d, t) => setProg([d, t])); },
    [n],
    () => 1_800_000,
    peekInForm(n)
  );
  const fresh = data && !loading;
  return (
    <div>
      <div className="page-head">
        <div className="page-title">
          <h1>Top Form</h1>
          <span className="muted">Best average DiDa rating over each player's last {n} league matches in the top 5 leagues. Players must have played all {n}.</span>
        </div>
      </div>
      <div className="pad-x">
        <div className="seg" role="group" aria-label="Number of matches">
          {([3, 5, 10] as const).map((k) => (
            <button key={k} className={n === k ? 'sel' : ''} aria-pressed={n === k} onClick={() => prefs.set({ n: k })}>Last {k}</button>
          ))}
        </div>
      </div>
      {loading && !fresh && (
        <>
          <p className="pad muted form-prog">{prog && prog[1] ? `Rating players in ${prog[0]} of ${prog[1]} recent matches…` : `Finding each team's last ${n} matches…`}</p>
          {!data && <Loading />}
        </>
      )}
      {error && !data && <ErrorBox error={error} onRetry={refresh} />}
      {data && !data.length && <Empty title="Not enough recent matches yet" />}
      {data && data.length > 0 && (
        <div className={`table-wrap scroll-x ${loading ? 'stale' : ''}`}>
          <table className="standings scorers">
            <thead>
              <tr>
                <th className="c-rank">#</th>
                <th className="c-team c-sticky">Player</th>
                <th title="Nationality">Nat</th>
                <th>Age</th>
                <th title={`Average DiDa rating, last ${n} matches`}>Form</th>
                <th>G</th>
                <th>A</th>
                <th title="Rating in each match, newest first">Last {n}</th>
                <th title="Position">Pos</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r, i) => <Row key={r.id} r={r} rank={i + 1} mine={r.team.id === myClub.id} />)}
            </tbody>
          </table>
        </div>
      )}
      <p className="footnote muted">DiDa rating from ESPN match data: LALIGA, Premier League, Serie A, Bundesliga and Ligue 1 (cups and European games not included). Goals and assists are over the same matches. Updates every 30 minutes; the first load of "Last 10" takes up to a minute.</p>
    </div>
  );
}
