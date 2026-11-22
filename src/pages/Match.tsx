import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getMatchDetail, getStandings } from '../api/espn';
import type { Incident, Lineup, MatchDetail, MiniResult, StandingGroup } from '../api/types';
import { Crest } from '../components/Crest';
import { Pitch } from '../components/Pitch';
import { StandingsTable } from '../components/StandingsTable';
import { Empty, ErrorBox, Loading } from '../components/States';
import { Star } from '../components/Star';
import { fmtLongDate, fmtShortDate, fmtTime } from '../lib/dates';
import { ratingBand } from '../lib/rating';
import { favorites, settings, toggleMatch, toggleTeam } from '../lib/store';
import { usePoll } from '../lib/usePoll';

type Tab = 'summary' | 'stats' | 'lineups' | 'table' | 'form';

const ICON: Record<Incident['kind'], string> = {
  goal: '⚽', 'own-goal': '⚽', 'penalty-goal': '⚽', 'penalty-miss': '✕', yellow: '', red: '', sub: '⇄', period: '', var: 'VAR', other: '•',
};

function Kind({ i }: { i: Incident }) {
  if (i.kind === 'yellow') return <span className="card yellow" aria-label="Yellow card" />;
  if (i.kind === 'red') return <span className="card red" aria-label="Red card" />;
  return <span className={`ik ik-${i.kind}`} aria-hidden>{ICON[i.kind]}</span>;
}

function Timeline({ d }: { d: MatchDetail }) {
  const items = d.incidents.filter((i) => i.kind !== 'other');
  if (!items.length) return <Empty title={d.match.state === 'pre' ? 'Match not started yet' : 'No events yet'} />;
  return (
    <ol className="timeline">
      {items.map((i, idx) => {
        if (i.kind === 'period') return <li key={idx} className="tl-period"><span>{i.text.split(',')[0].replace(/\.$/, '')}</span></li>;
        const label = i.kind === 'sub' ? (
          <><span className="sub-in">{i.player}</span>{i.secondary && <span className="sub-out">{i.secondary}</span>}</>
        ) : (
          <>
            <span className="tl-player">{i.player ?? i.text}</span>
            {i.kind === 'own-goal' && <span className="tl-sub">Own goal</span>}
            {i.kind === 'penalty-goal' && <span className="tl-sub">Penalty</span>}
            {i.kind === 'penalty-miss' && <span className="tl-sub">Missed penalty</span>}
            {i.kind === 'goal' && i.secondary && <span className="tl-sub">Assist: {i.secondary}</span>}
          </>
        );
        return (
          <li key={idx} className={`tl-item ${i.side ?? 'home'} ${['goal', 'own-goal', 'penalty-goal'].includes(i.kind) ? 'is-goal' : ''}`}>
            <span className="tl-min">{i.minute}</span>
            <span className="tl-body"><Kind i={i} /><span className="tl-text">{label}</span></span>
          </li>
        );
      })}
    </ol>
  );
}

function Stats({ d }: { d: MatchDetail }) {
  if (!d.stats.length) return <Empty title="No statistics yet" />;
  return (
    <div className="stats">
      <div className="stats-head">
        <Crest src={d.match.home.team.logo} name={d.match.home.team.name} size={22} />
        <span>Match stats</span>
        <Crest src={d.match.away.team.logo} name={d.match.away.team.name} size={22} />
      </div>
      {d.stats.map((s) => {
        const total = s.home + s.away || 1;
        const hp = (s.home / total) * 100;
        const lead = s.home > s.away ? 'home' : s.away > s.home ? 'away' : '';
        return (
          <div className="stat" key={s.key}>
            <div className="stat-row">
              <span className={lead === 'home' ? 'lead' : ''}>{s.homeText}</span>
              <span className="stat-label">{s.label}</span>
              <span className={lead === 'away' ? 'lead' : ''}>{s.awayText}</span>
            </div>
            <div className="stat-bars">
              <span className="bar home"><i style={{ width: `${hp}%` }} className={lead === 'home' ? 'lead' : ''} /></span>
              <span className="bar away"><i style={{ width: `${100 - hp}%` }} className={lead === 'away' ? 'lead' : ''} /></span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PlayerList({ l, bench }: { l: Lineup; bench: boolean }) {
  const ps = l.players.filter((p) => p.starter !== bench).sort((a, b) => (a.formationPlace ?? 99) - (b.formationPlace ?? 99));
  return (
    <ul className="plist">
      {ps.map((p) => (
        <li key={p.id} className={p.subbedIn ? 'came-on' : ''}>
          <span className="pl-num">{p.jersey}</span>
          <span className="pl-name">{p.name}</span>
          <span className="pl-flags">
            {p.goals > 0 && <span title="Goal">⚽{p.goals > 1 ? `×${p.goals}` : ''}</span>}
            {p.yellow && <span className="card yellow sm" />}
            {p.red && <span className="card red sm" />}
            {p.subbedIn && <span className="sub-in-ico" title="Came on">↑</span>}
            {p.subbedOut && <span className="sub-out-ico" title="Substituted">↓</span>}
          </span>
          <span className="pl-pos">{p.position === 'SUB' ? '' : p.position}</span>
          {p.rating != null ? <span className={`rating ${ratingBand(p.rating)}`}>{p.rating.toFixed(1)}</span> : <span />}
        </li>
      ))}
    </ul>
  );
}

function Lineups({ d }: { d: MatchDetail }) {
  const [home, away] = [d.lineups.find((l) => l.side === 'home'), d.lineups.find((l) => l.side === 'away')];
  if (!home || !away || !home.players.length) return <Empty title="Lineups not announced yet">They usually appear about an hour before kick-off.</Empty>;
  return (
    <>
      <div className="formations">
        <span><Crest src={home.team.logo} name={home.team.name} size={18} /> {home.formation}</span>
        <span>{away.formation} <Crest src={away.team.logo} name={away.team.name} size={18} /></span>
      </div>
      <Pitch home={home} away={away} />
      <div className="lineup-cols">
        {[home, away].map((l) => (
          <div key={l.side}>
            <h3 className="col-title">{l.team.short}</h3>
            <PlayerList l={l} bench={false} />
            {l.players.some((p) => !p.starter) && (<><h4 className="col-sub">Substitutes</h4><PlayerList l={l} bench /></>)}
          </div>
        ))}
      </div>
    </>
  );
}

function TopPlayers({ d }: { d: MatchDetail }) {
  const all = d.lineups.flatMap((l) => l.players.filter((p) => p.rating != null).map((p) => ({ p, team: l.team })));
  if (!all.length) return null;
  const top = all.sort((a, b) => (b.p.rating ?? 0) - (a.p.rating ?? 0)).slice(0, 5);
  return (
    <div className="card-box topplayers">
      <h3 className="col-title">Top rated players</h3>
      <ul className="plist">
        {top.map(({ p, team }, i) => (
          <li key={p.id} className="tp-row">
            <Crest src={team.logo} name={team.name} size={18} />
            <span className="pl-name">{p.name}{i === 0 && d.match.state === 'post' && <span className="potm">Player of the match</span>}</span>
            <span className="pl-flags">{p.goals > 0 && <span>⚽{p.goals > 1 ? `×${p.goals}` : ''}</span>}{(p.stats.goalAssists ?? 0) > 0 && <span className="muted">A{p.stats.goalAssists > 1 ? `×${p.stats.goalAssists}` : ''}</span>}</span>
            <span className={`rating ${ratingBand(p.rating!)}`}>{p.rating!.toFixed(1)}</span>
          </li>
        ))}
      </ul>
      <p className="footnote muted">DiDa rating from ESPN match stats: goals, assists, shots, saves, cards and the result. Everyone starts at 6.5.</p>
    </div>
  );
}

function Mini({ r }: { r: MiniResult }) {
  return (
    <li className="mini">
      <span className="mini-date">{r.date ? fmtShortDate(r.date) : ''}</span>
      <span className="mini-ha">{r.homeAway === 'home' ? 'vs' : '@'}</span>
      <Crest src={r.opponent.logo} name={r.opponent.name} size={16} />
      <span className="mini-opp">{r.opponent.short}</span>
      <span className="mini-score">{r.score}</span>
      {r.result && <span className={`res res-${r.result}`}>{r.result}</span>}
    </li>
  );
}

function Form({ d }: { d: MatchDetail }) {
  if (!d.form.length && !d.h2h.length) return <Empty title="No recent form available" />;
  return (
    <div className="form-cols">
      {d.form.map((f) => (
        <div key={f.team.id} className="card-box">
          <h3 className="col-title"><Crest src={f.team.logo} name={f.team.name} size={18} /> {f.team.short}: last {f.games.length}</h3>
          <div className="form-pills">{f.games.map((g) => g.result && <span key={g.id} className={`res res-${g.result}`}>{g.result}</span>)}</div>
          <ul className="minis">{f.games.map((g) => <Mini key={g.id} r={g} />)}</ul>
        </div>
      ))}
      {d.h2h.length > 0 && (
        <div className="card-box">
          <h3 className="col-title">Head to head</h3>
          <ul className="minis">{d.h2h.map((g) => <Mini key={g.id} r={g} />)}</ul>
        </div>
      )}
    </div>
  );
}

function TableTab({ d, sport }: { d: MatchDetail; sport: string }) {
  const { data, error, loading } = usePoll<StandingGroup[]>(() => getStandings(sport, d.league.slug), [d.league.slug], () => (d.match.state === 'in' ? 60_000 : 0));
  if (loading && !data) return <Loading />;
  if (error || !data?.length) return <Empty title="No table for this competition" />;
  const ids = [d.match.home.team.id, d.match.away.team.id];
  const groups = data.length > 1 ? data.filter((g) => g.rows.some((r) => ids.includes(r.team.id))) : data;
  return <StandingsTable groups={groups.length ? groups : data} sport={sport} league={d.league.slug} highlight={ids} />;
}

export function MatchPage() {
  const { sport = 'soccer', league = 'all', id = '' } = useParams();
  const { h24 } = settings.use();
  const fav = favorites.use();
  const { data, error, loading, refresh } = usePoll(
    () => getMatchDetail(sport, league, id),
    [sport, league, id],
    (d) => (!d ? 30_000 : d.match.state === 'in' ? 15_000 : d.match.state === 'pre' ? 120_000 : 0)
  );
  const [tab, setTab] = useState<Tab>('summary');

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorBox error={error} onRetry={refresh} />;
  if (!data) return null;
  const { match: m } = data;
  const live = m.state === 'in';
  const tabs: [Tab, string][] = [['summary', 'Summary'], ['stats', 'Stats'], ...(sport === 'soccer' ? [['lineups', 'Lineups'] as [Tab, string]] : []), ['table', 'Table'], ['form', 'Form & H2H']];
  const scorers = (side: 'home' | 'away') => m.goals.filter((g) => g.side === side);
  const teamFav = (tid: string) => fav.teams.some((t) => t.id === tid);

  return (
    <div className="match">
      <div className="mh">
        <div className="mh-top">
          <Link to={`/league/${sport}/${data.league.slug}`} className="mh-league">
            <Crest src={data.league.logo} name={data.league.name} size={16} />
            {data.league.name}
          </Link>
          <Star on={fav.matches.includes(m.id)} label="match" onClick={() => toggleMatch(m.id)} />
        </div>
        <div className="mh-main">
          {(['home', 'away'] as const).map((s, i) => {
            const t = m[s].team;
            const teamCol = (
              <div className="mh-team" key={s}>
                <Link to={`/team/${sport}/${data.league.slug}/${t.id}`}><Crest src={t.logo} name={t.name} size={56} /></Link>
                <Link to={`/team/${sport}/${data.league.slug}/${t.id}`} className="mh-name">{t.name}</Link>
                <Star on={teamFav(t.id)} label={t.name} size={16} onClick={() => toggleTeam({ id: t.id, name: t.name, logo: t.logo, league: data.league.slug, sport })} />
              </div>
            );
            if (i === 0) {
              return [
                teamCol,
                <div className="mh-score" key="score">
                  {m.state === 'pre' && !m.cancelled ? (
                    <>
                      <span className="mh-time">{fmtTime(m.date, h24)}</span>
                      <span className="mh-date">{fmtShortDate(m.date)}</span>
                    </>
                  ) : (
                    <>
                      <span className={`mh-digits ${live ? 'is-live' : ''}`}>{m.home.score ?? '-'}<i>–</i>{m.away.score ?? '-'}</span>
                      {m.home.shootout != null && <span className="mh-pens">Pens {m.home.shootout}–{m.away.shootout}</span>}
                    </>
                  )}
                  <span className={`mh-status ${live ? 'is-live' : ''}`}>{live && <span className="pulse" />}{m.status || m.statusLong}</span>
                </div>,
              ];
            }
            return teamCol;
          })}
        </div>
        {m.goals.length > 0 && (
          <div className="mh-scorers">
            {(['home', 'away'] as const).map((s) => (
              <ul key={s} className={s}>
                {scorers(s).map((g, i) => <li key={i}>{g.player} {g.minute}{g.kind === 'penalty-goal' ? ' (P)' : g.kind === 'own-goal' ? ' (OG)' : ''}</li>)}
              </ul>
            ))}
          </div>
        )}
      </div>

      <div className="tabs" role="tablist">
        {tabs.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={`tab ${tab === k ? 'sel' : ''}`} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      <div className="tabpanel">
        {tab === 'summary' && (
          <>
            <Timeline d={data} />
            <div className="pad-x"><TopPlayers d={data} /></div>
            <dl className="info">
              <div><dt>Kick-off</dt><dd>{fmtLongDate(m.date)}, {fmtTime(m.date, h24)}</dd></div>
              {m.venue && <div><dt>Venue</dt><dd>{m.venue}</dd></div>}
              {data.attendance ? <div><dt>Attendance</dt><dd>{data.attendance.toLocaleString()}</dd></div> : null}
              {data.referee && <div><dt>Referee</dt><dd>{data.referee}</dd></div>}
              {m.note && m.note !== data.league.short && m.note !== data.league.name && <div><dt>Note</dt><dd>{m.note}</dd></div>}
            </dl>
          </>
        )}
        {tab === 'stats' && <Stats d={data} />}
        {tab === 'lineups' && <Lineups d={data} />}
        {tab === 'table' && <TableTab d={data} sport={sport} />}
        {tab === 'form' && <Form d={data} />}
      </div>
    </div>
  );
}
