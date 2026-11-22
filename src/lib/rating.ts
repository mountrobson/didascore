import type { Lineup, LineupPlayer, Match } from '../api/types';

/*
 * DiDa rating: a transparent 3.0–10.0 match rating built only from the per-player stats ESPN publishes
 * (goals, assists, shots, saves, fouls, cards, goals conceded) plus the result.
 * Everyone who plays starts at 6.5; events move it up or down; short cameos are pulled toward 6.5.
 */
type Role = 'gk' | 'def' | 'mid' | 'fwd';

function role(pos = ''): Role {
  const p = pos.toUpperCase().replace(/-[LRC]$/, '');
  if (p === 'G' || p === 'GK') return 'gk';
  if (['CD', 'CB', 'LB', 'RB', 'SW', 'D', 'LWB', 'RWB', 'WB'].includes(p)) return 'def';
  if (['F', 'CF', 'ST', 'S', 'LF', 'RF', 'FW'].includes(p)) return 'fwd';
  return 'mid';
}

export function ratePlayer(p: LineupPlayer, result: 'W' | 'D' | 'L' | undefined, teamConceded: number): number | undefined {
  const played = p.starter || p.subbedIn;
  if (!played) return undefined;
  const s = p.stats;
  const r = role(p.position === 'SUB' ? undefined : p.position);
  const goals = s.totalGoals ?? 0;
  const assists = s.goalAssists ?? 0;
  const sot = s.shotsOnTarget ?? 0;
  const offTarget = Math.max(0, (s.totalShots ?? 0) - sot);
  const conceded = s.goalsConceded ?? (r === 'gk' || r === 'def' ? teamConceded : 0);

  let d = 0;
  d += goals * (r === 'fwd' ? 0.9 : r === 'mid' ? 1.0 : 1.2);
  d += assists * 0.7;
  d += sot * 0.15 + offTarget * 0.04;
  d += (s.foulsSuffered ?? 0) * 0.08 - (s.foulsCommitted ?? 0) * 0.1;
  d -= (s.offsides ?? 0) * 0.05;
  d -= (s.yellowCards ?? 0) * 0.3 + (s.redCards ?? 0) * 1.5 + (s.ownGoals ?? 0) * 1.0;
  if (r === 'gk') {
    d += (s.saves ?? 0) * 0.25;
    d -= conceded * 0.35;
    if (conceded === 0 && p.starter && !p.subbedOut) d += 0.6;
  } else if (r === 'def') {
    d -= conceded * 0.15;
    if (conceded === 0 && p.starter && !p.subbedOut) d += 0.4;
  }
  if (result === 'W') d += 0.3;
  if (result === 'L') d -= 0.2;
  // Cameos and early withdrawals: less evidence, so pull toward the baseline.
  if (p.subbedIn) d *= 0.7;
  const v = Math.min(10, Math.max(3, 6.5 + d));
  return Math.round(v * 10) / 10;
}

export function rateLineups(lineups: Lineup[], m: Match): Lineup[] {
  if (m.state === 'pre') return lineups;
  const hs = Number(m.home.score ?? 0);
  const as = Number(m.away.score ?? 0);
  return lineups.map((l) => {
    const mine = l.side === 'home' ? hs : as;
    const theirs = l.side === 'home' ? as : hs;
    const result = m.state === 'post' ? (mine > theirs ? 'W' : mine < theirs ? 'L' : 'D') : undefined;
    return { ...l, players: l.players.map((p) => ({ ...p, rating: ratePlayer(p, result, theirs) })) };
  });
}

/** Colour band for a rating, used by the UI. */
export function ratingBand(r: number): 'r-top' | 'r-great' | 'r-good' | 'r-ok' | 'r-poor' {
  if (r >= 8.5) return 'r-top';
  if (r >= 7.5) return 'r-great';
  if (r >= 7) return 'r-good';
  if (r >= 6) return 'r-ok';
  return 'r-poor';
}
