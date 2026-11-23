import { useState } from 'react';
import { getInForm, type FormRow } from '../api/form';
import { ratingBand } from '../lib/rating';
import { playerHref } from '../lib/links';
import { Link, useSearchParams } from 'react-router-dom';
import { getGoldenShoe, getTopScorers } from '../api/scorers';
import type { Scorer } from '../api/types';
import { Avatar, smallLogo } from '../components/Avatar';
import { getPlayerBio } from '../api/players';
import { Empty, ErrorBox, Loading } from '../components/States';
import { club, createStore } from '../lib/store';

const shoePrefs = createStore<{ top5: boolean }>('dida.shoe', { top5: false });
import { usePoll } from '../lib/usePoll';

const TABS: [string, string][] = [
  ['form', 'In form'],
  ['shoe', 'Golden Shoe'],
  ['esp.1', 'LALIGA'],
  ['uefa.champions', 'Champions League'],
  ['eng.1', 'Premier League'],
  ['ita.1', 'Serie A'],
  ['ger.1', 'Bundesliga'],
  ['fra.1', 'Ligue 1'],
];

function rankOf(list: Scorer[], i: number, key: (s: Scorer) => number) {
  // Shared rank for ties: 1, 2, 2, 4 …
  let r = i;
  while (r > 0 && key(list[r - 1]) === key(list[i])) r--;
  return r + 1;
}

function ScorerRow({ s, rank, shoe, mine }: { s: Scorer; rank: number; shoe: boolean; mine: boolean }) {
  const { data: bio } = usePoll(() => getPlayerBio(s.id), [s.id], () => 0);
  return (
    <tr className={mine ? 'hl' : ''}>
      <td className="c-rank"><span className="rank">{rank}</span></td>
      <td className="c-team c-sticky">
        <Link to={playerHref(s.id, s.league)} className="scorer">
          <Avatar id={s.id} name={s.name} birthYear={bio?.birthYear} crest={s.team.logo} size={36} wait={!bio} />
          <div className="scorer-txt">
            <span className="scorer-name">{s.name}</span>
            <span className="scorer-sub">{s.team.short}{shoe && s.leagueName ? ` · ${s.leagueName}` : ''}</span>
          </div>
        </Link>
      </td>
      <td className="c-nat" title={bio?.nationality}>{bio?.flag ? <img src={smallLogo(bio.flag, 40)} alt={bio.nationality ?? ''} /> : ''}</td>
      <td>{bio?.age ?? ''}</td>
      <td className={shoe ? '' : 'c-pts'}>{s.goals}</td>
      {shoe && <td className="c-pts">{(s.points ?? 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>}
      <td>{s.assists ?? ''}</td>
      <td>{s.matches ?? ''}</td>
      <td className="muted">{s.matches ? (s.goals / s.matches).toFixed(2) : ''}</td>
      <td>{bio?.position ?? ''}</td>
    </tr>
  );
}

function FormRowView({ r, rank, mine }: { r: FormRow; rank: number; mine: boolean }) {
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
      <td><span className={`rating ${ratingBand(r.avg)}`}>{r.avg.toFixed(1)}</span></td>
      <td className="c-last3">
        {r.games.map((g) => (
          <Link key={g.id} to={`/match/soccer/${g.league}/${g.id}`} title={`vs ${g.opponent.short}`} className={`rating sm ${ratingBand(g.rating)}`}>{g.rating.toFixed(1)}</Link>
        ))}
      </td>
      <td>{r.goals}</td>
      <td>{r.assists}</td>
      <td>{bio?.position ?? r.position ?? ''}</td>
    </tr>
  );
}

function InForm({ myClub }: { myClub: string }) {
  const [prog, setProg] = useState<[number, number]>();
  const { data, error, loading, refresh } = usePoll(() => getInForm(undefined, (d, t) => setProg([d, t])), [], () => 1_800_000);
  if (loading && !data) return (
    <>
      <p className="pad muted form-prog">{prog && prog[1] ? `Rating players in ${prog[0]} of ${prog[1]} recent matches…` : 'Finding each team\'s last 3 matches…'}</p>
      <Loading />
    </>
  );
  if (error && !data) return <ErrorBox error={error} onRetry={refresh} />;
  if (!data?.length) return <Empty title="Not enough recent matches yet" />;
  return (
    <>
      <div className="table-wrap scroll-x">
        <table className="standings scorers">
          <thead>
            <tr>
              <th className="c-rank">#</th>
              <th className="c-team c-sticky">Player</th>
              <th title="Nationality">Nat</th>
              <th>Age</th>
              <th title="Average DiDa rating, last 3 matches">Form</th>
              <th title="Rating in each of the last 3 matches, newest first">Last 3</th>
              <th>G</th>
              <th>A</th>
              <th title="Position">Pos</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r, i) => <FormRowView key={r.id} r={r} rank={i + 1} mine={r.team.id === myClub} />)}
          </tbody>
        </table>
      </div>
      <p className="footnote muted">DiDa rating from ESPN match data (LALIGA, Premier League, Serie A, Bundesliga, Ligue 1; cups and European games not included). Goals and assists are over the same 3 matches. Updates every 30 minutes.</p>
    </>
  );
}

export function Scorers() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('t') || 'shoe';
  const { team: myClub } = club.use();
  const shoe = tab === 'shoe';
  const form = tab === 'form';
  const { top5 } = shoePrefs.use();
  const { data, error, loading, refresh } = usePoll<Scorer[]>(
    () => (form ? Promise.resolve([]) : shoe ? getGoldenShoe(top5) : getTopScorers(tab)),
    [tab, top5],
    () => 600_000
  );
  const key = (s: Scorer) => (shoe ? s.points ?? 0 : s.goals);

  return (
    <div>
      <div className="page-head">
        <div className="page-title">
          <h1>{form ? 'In form' : shoe ? 'European Golden Shoe' : 'Top scorers'}</h1>
          <span className="muted">
            {form ? 'Best average DiDa rating over the last 3 league matches, top 5 leagues. Players must have played all 3.' : shoe ? 'League goals × weight: 2 for the top five leagues, 1.5 for leagues ranked 6–22.' : 'Goals in this competition this season.'}
          </span>
        </div>
      </div>
      <div className="chips scroll-chips">
        {TABS.map(([k, label]) => (
          <button key={k} className={`chip ${tab === k ? 'sel' : ''}`} onClick={() => setParams(k === 'shoe' ? {} : { t: k }, { replace: true })}>{label}</button>
        ))}
      </div>
      {shoe && (
        <div className="pad-x">
          <div className="seg" role="group" aria-label="Leagues in the race">
            <button className={!top5 ? 'sel' : ''} aria-pressed={!top5} onClick={() => shoePrefs.set({ top5: false })}>All leagues</button>
            <button className={top5 ? 'sel' : ''} aria-pressed={top5} onClick={() => shoePrefs.set({ top5: true })}>Top 5 leagues</button>
          </div>
        </div>
      )}
      {form && <InForm myClub={myClub.id} />}
      {!form && loading && !data && <Loading />}
      {!form && error && !data && <ErrorBox error={error} onRetry={refresh} />}
      {!form && data && !data.length && <Empty title="No scorers yet" />}
      {!form && data && data.length > 0 && (
        <div className="table-wrap scroll-x">
          <table className="standings scorers">
            <thead>
              <tr>
                <th className="c-rank">#</th>
                <th className="c-team c-sticky">Player</th>
                <th title="Nationality">Nat</th>
                <th>Age</th>
                <th>G</th>
                {shoe && <th className="c-pts">Pts</th>}
                <th>A</th>
                <th title="Matches played">MP</th>
                <th title="Goals per game">G/G</th>
                <th title="Position">Pos</th>
              </tr>
            </thead>
            <tbody>
              {data.map((s, i) => (
                <ScorerRow key={`${s.league}-${s.id}`} s={s} rank={rankOf(data, i, key)} shoe={shoe} mine={s.team.id === myClub.id} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!form && <p className="footnote muted">Data from ESPN league stats. Photos from Wikipedia where available. Golden Shoe weights follow the UEFA league ranking (approximate).</p>}
    </div>
  );
}
