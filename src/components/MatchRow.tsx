import { Link } from 'react-router-dom';
import type { Match, Side } from '../api/types';
import { fmtShortDate, fmtTime } from '../lib/dates';
import { favorites, settings, toggleMatch } from '../lib/store';
import { Crest } from './Crest';
import { Star } from './Star';

export function matchHref(m: Match) {
  return `/match/${m.sport}/${m.leagueSlug || 'all'}/${m.id}`;
}

function TeamLine({ side, other, m, fav }: { side: Side; other: Side; m: Match; fav: boolean }) {
  const lost = m.state === 'post' && side.winner === false && other.winner === true;
  return (
    <div className={`tl ${lost ? 'lost' : ''} ${side.winner ? 'won' : ''}`}>
      <Crest src={side.team.logo} name={side.team.name} size={18} />
      <span className="tl-name">
        <span className="nm-full">{side.team.name}</span>
        <span className="nm-short">{side.team.short}</span>
        {fav && <span className="dot-fav" title="Following" />}
      </span>
      {side.redCards > 0 && <span className="rc" title={`${side.redCards} red card${side.redCards > 1 ? 's' : ''}`}>{side.redCards > 1 ? side.redCards : ''}</span>}
    </div>
  );
}

export function MatchRow({ m, flash, showDate }: { m: Match; flash?: 'home' | 'away'; showDate?: boolean }) {
  const { h24 } = settings.use();
  const fav = favorites.use();
  const favIds = new Set(fav.teams.map((t) => t.id));
  const live = m.state === 'in';
  const showScore = m.state !== 'pre' && m.home.score != null;
  const starred = fav.matches.includes(m.id);
  return (
    <Link to={matchHref(m)} className={`mrow ${live ? 'live' : ''} ${flash ? 'flash' : ''}`}>
      <div className={`mstatus ${live ? 'is-live' : ''} ${m.cancelled ? 'is-off' : ''}`}>
        {showDate && <span className="mdate">{fmtShortDate(m.date)}</span>}
        {m.state === 'pre' && !m.cancelled ? fmtTime(m.date, h24) : m.status}
      </div>
      <div className="mteams">
        <TeamLine side={m.home} other={m.away} m={m} fav={favIds.has(m.home.team.id)} />
        <TeamLine side={m.away} other={m.home} m={m} fav={favIds.has(m.away.team.id)} />
      </div>
      <div className={`mscore ${live ? 'is-live' : ''}`}>
        {showScore ? (
          <>
            <span className={flash === 'home' ? 'bump' : ''}>{m.home.score}</span>
            <span className={flash === 'away' ? 'bump' : ''}>{m.away.score}</span>
          </>
        ) : (
          <><span className="dash">–</span><span className="dash">–</span></>
        )}
        {m.home.shootout != null && m.away.shootout != null && (
          <span className="pens">({m.home.shootout}–{m.away.shootout} p)</span>
        )}
      </div>
      <Star on={starred} onClick={() => toggleMatch(m.id)} label="match" size={18} />
    </Link>
  );
}
