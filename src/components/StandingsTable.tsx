import { Link } from 'react-router-dom';
import type { StandingGroup } from '../api/types';
import { favorites } from '../lib/store';
import { Crest } from './Crest';

export function StandingsTable({ groups, sport, league, highlight = [] }: { groups: StandingGroup[]; sport: string; league: string; highlight?: string[] }) {
  const fav = favorites.use();
  const favIds = new Set(fav.teams.map((t) => t.id));
  return (
    <>
      {groups.map((g) => {
        const notes = [...new Map(g.rows.filter((r) => r.note).map((r) => [r.note, r.noteColor])).entries()];
        return (
          <div key={g.name} className="table-wrap">
            {groups.length > 1 && <div className="table-title">{g.name}</div>}
            <table className="standings">
              <thead>
                <tr>
                  <th className="c-rank">#</th>
                  <th className="c-team">Team</th>
                  <th>P</th>
                  <th className="hide-xs">W</th>
                  <th className="hide-xs">D</th>
                  <th className="hide-xs">L</th>
                  <th className="hide-sm">Goals</th>
                  <th>GD</th>
                  <th className="c-pts">Pts</th>
                </tr>
              </thead>
              <tbody>
                {g.rows.map((r) => (
                  <tr key={r.team.id} className={`${highlight.includes(r.team.id) ? 'hl' : ''} ${favIds.has(r.team.id) ? 'fav' : ''}`}>
                    <td className="c-rank">
                      <span className="rank" style={r.noteColor ? { boxShadow: `inset 3px 0 0 ${r.noteColor}` } : undefined} title={r.note}>{r.rank}</span>
                    </td>
                    <td className="c-team">
                      <Link to={`/team/${sport}/${league}/${r.team.id}`}>
                        <Crest src={r.team.logo} name={r.team.name} size={18} />
                        <span>{r.team.short}</span>
                      </Link>
                    </td>
                    <td>{r.played}</td>
                    <td className="hide-xs">{r.won}</td>
                    <td className="hide-xs">{r.drawn}</td>
                    <td className="hide-xs">{r.lost}</td>
                    <td className="hide-sm">{r.gf}:{r.ga}</td>
                    <td>{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                    <td className="c-pts">{r.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {notes.length > 0 && (
              <ul className="legend">
                {notes.map(([n, c]) => (
                  <li key={n}><span className="sw" style={{ background: c }} />{n}</li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </>
  );
}
