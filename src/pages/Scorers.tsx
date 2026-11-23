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
  const facts = [bio?.age ? `${bio.age} yrs` : undefined, bio?.position, s.matches ? `${(s.goals / s.matches).toFixed(2)} G/MP` : undefined].filter(Boolean).join(' · ');
  return (
    <tr className={mine ? 'hl' : ''}>
      <td className="c-rank"><span className="rank">{rank}</span></td>
      <td className="c-team">
        <Link to={playerHref(s.id, s.league)} className="scorer">
          <Avatar id={s.id} name={s.name} birthYear={bio?.birthYear} crest={s.team.logo} size={40} wait={!bio} />
          <div className="scorer-txt">
            <span className="scorer-name">{s.name}</span>
            <span className="scorer-bio">
              {bio?.flag && <img src={smallLogo(bio.flag, 40)} alt="" />}
              {[bio?.nationality, facts].filter(Boolean).join(' · ') || '\u00a0'}
            </span>
            <span className="scorer-sub">{s.team.short}{shoe && s.leagueName ? ` · ${s.leagueName}` : ''}</span>
          </div>
        </Link>
      </td>
      <td className="hide-xs">{s.matches ?? ''}</td>
      <td className={shoe ? '' : 'c-pts'}>{s.goals}</td>
      <td>{s.assists ?? ''}</td>
      {shoe && <td className="c-pts">{(s.points ?? 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>}
    </tr>
  );
}

export function Scorers() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('t') || 'shoe';
  const { team: myClub } = club.use();
  const shoe = tab === 'shoe';
  const { top5 } = shoePrefs.use();
  const { data, error, loading, refresh } = usePoll<Scorer[]>(
    () => (shoe ? getGoldenShoe(top5) : getTopScorers(tab)),
    [tab, top5],
    () => 600_000
  );
  const key = (s: Scorer) => (shoe ? s.points ?? 0 : s.goals);

  return (
    <div>
      <div className="page-head">
        <div className="page-title">
          <h1>{shoe ? 'European Golden Shoe' : 'Top scorers'}</h1>
          <span className="muted">
            {shoe ? 'League goals × weight: 2 for the top five leagues, 1.5 for leagues ranked 6–22.' : 'Goals in this competition this season.'}
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
      {loading && !data && <Loading />}
      {error && !data && <ErrorBox error={error} onRetry={refresh} />}
      {data && !data.length && <Empty title="No scorers yet" />}
      {data && data.length > 0 && (
        <div className="table-wrap">
          <table className="standings scorers">
            <thead>
              <tr>
                <th className="c-rank">#</th>
                <th className="c-team">Player</th>
                <th className="hide-xs">MP</th>
                <th>G</th>
                <th>A</th>
                {shoe && <th className="c-pts">Pts</th>}
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
      <p className="footnote muted">Data from ESPN league stats. Photos from Wikipedia where available. Golden Shoe weights follow the UEFA league ranking (approximate).</p>
    </div>
  );
}
