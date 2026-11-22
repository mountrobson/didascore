import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getLeagues, getTeamSchedule, leagueFromIndex } from '../api/espn';
import type { Match } from '../api/types';
import { fmtShortDate, fmtTime } from '../lib/dates';
import { club, settings } from '../lib/store';
import { usePoll } from '../lib/usePoll';
import { Crest } from './Crest';
import { matchHref } from './MatchRow';

function countdown(iso: string, now: number) {
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return 'Kick-off';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 48) return `in ${Math.round(h / 24)} days`;
  if (h >= 1) return `in ${h}h ${m}m`;
  return `in ${m} min`;
}

function resultFor(m: Match, teamId: string) {
  const me = m.home.team.id === teamId ? m.home : m.away;
  const opp = me === m.home ? m.away : m.home;
  const a = Number(me.score), b = Number(opp.score);
  return a > b ? 'W' : a < b ? 'L' : 'D';
}

/** The "my club" hero at the top of Scores: live match, else next match with countdown, plus last result and form. */
export function ClubCard() {
  const { team: c } = club.use();
  const { h24 } = settings.use();
  const [, setLeaguesReady] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    getLeagues(c.sport).then(() => setLeaguesReady(true)).catch(() => undefined);
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, [c.sport]);

  const { data } = usePoll(
    () => getTeamSchedule(c.sport, c.league, c.id),
    [c.id, c.league],
    (d) => {
      const nxt = d?.upcoming[0];
      if (!nxt) return 300_000;
      if (nxt.state === 'in') return 20_000;
      return new Date(nxt.date).getTime() - Date.now() < 15 * 60_000 ? 30_000 : 300_000;
    }
  );

  const t = data?.team;
  const live = data?.upcoming.find((m) => m.state === 'in');
  const next = data?.upcoming.find((m) => m.state === 'pre' && !m.cancelled);
  const last = data?.results[0];
  const form = (data?.results ?? []).slice(0, 5).map((m) => ({ id: m.id, r: resultFor(m, c.id) })).reverse();
  const color = t?.color && t.color !== '#ffffff' ? t.color : '#a50044';
  const alt = t?.alt && t.alt !== '#ffffff' && t.alt !== t.color ? t.alt : '#004d98';
  const lgName = (m: Match) => leagueFromIndex(m.leagueId)?.short ?? '';
  const focus = live ?? next;

  return (
    <section className="club" style={{ ['--c1' as string]: color, ['--c2' as string]: alt }}>
      <Link to="/club" className="club-head">
        <Crest src={t?.logo ?? c.logo} name={c.name} size={36} />
        <div className="club-title">
          <strong>{t?.name ?? c.name}</strong>
          <span>{data?.standingSummary ?? ' '}</span>
        </div>
        {form.length > 0 && (
          <div className="club-form" aria-label="Last five results, oldest first">
            {form.map((f) => <span key={f.id} className={`res res-${f.r}`}>{f.r}</span>)}
          </div>
        )}
      </Link>

      {!data && <div className="club-body"><div className="club-skel" /></div>}

      {focus && (
        <Link to={matchHref(focus)} className="club-body">
          <div className="club-meta">
            {live ? <span className="club-live"><span className="pulse" /> Live · {live.status}</span> : <span>Next · {lgName(focus)}</span>}
            {!live && <span>{fmtShortDate(focus.date)} · {fmtTime(focus.date, h24)}</span>}
          </div>
          <div className="club-match">
            <div className="club-side">
              <Crest src={focus.home.team.logo} name={focus.home.team.name} size={40} />
              <span>{focus.home.team.short}</span>
            </div>
            <div className="club-score">
              {live ? (
                <span className="club-digits">{live.home.score}<i>–</i>{live.away.score}</span>
              ) : (
                <>
                  <span className="club-kick">{fmtTime(focus.date, h24)}</span>
                  <span className="club-count">{countdown(focus.date, now)}</span>
                </>
              )}
            </div>
            <div className="club-side">
              <Crest src={focus.away.team.logo} name={focus.away.team.name} size={40} />
              <span>{focus.away.team.short}</span>
            </div>
          </div>
        </Link>
      )}

      {last && (
        <Link to={matchHref(last)} className="club-last">
          <span className={`res res-${resultFor(last, c.id)}`}>{resultFor(last, c.id)}</span>
          <span className="club-last-txt">
            {last.home.team.short} {last.home.score}–{last.away.score} {last.away.team.short}
          </span>
          <span className="club-last-date">{lgName(last)} · {fmtShortDate(last.date)}</span>
        </Link>
      )}

      <nav className="club-links">
        <Link to="/club">Fixtures</Link>
        <Link to={`/league/${c.sport}/${c.league}`}>Table</Link>
        <Link to="/scorers">Golden Shoe</Link>
      </nav>
    </section>
  );
}
