import { useSearchParams } from 'react-router-dom';
import { getGoldenShoe, getTopScorers } from '../api/scorers';
import type { Scorer } from '../api/types';
import { Crest } from '../components/Crest';
import { Empty, ErrorBox, Loading } from '../components/States';
import { club } from '../lib/store';
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

export function Scorers() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('t') || 'shoe';
  const { team: myClub } = club.use();
  const shoe = tab === 'shoe';
  const { data, error, loading, refresh } = usePoll<Scorer[]>(
    () => (shoe ? getGoldenShoe() : getTopScorers(tab)),
    [tab],
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
                <th>{shoe ? 'G' : 'Goals'}</th>
                {shoe && <th className="c-pts">Pts</th>}
              </tr>
            </thead>
            <tbody>
              {data.map((s, i) => (
                <tr key={`${s.league}-${s.id}`} className={s.team.id === myClub.id ? 'hl' : ''}>
                  <td className="c-rank"><span className="rank">{rankOf(data, i, key)}</span></td>
                  <td className="c-team">
                    <div className="scorer">
                      <Crest src={s.team.logo} name={s.team.name} size={20} />
                      <div className="scorer-txt">
                        <span className="scorer-name">{s.name}</span>
                        <span className="scorer-sub">{s.team.short}{shoe && s.leagueName ? ` · ${s.leagueName}` : ''}</span>
                      </div>
                    </div>
                  </td>
                  <td className="hide-xs">{s.matches ?? ''}</td>
                  <td className={shoe ? '' : 'c-pts'}>{s.goals}</td>
                  {shoe && <td className="c-pts">{(s.points ?? 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="footnote muted">Data from ESPN league stats. Golden Shoe weights follow the UEFA league ranking (approximate).</p>
    </div>
  );
}
