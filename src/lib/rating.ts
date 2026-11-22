import type { Lineup, LineupPlayer, Match } from '../api/types';

/*
 * DiDa rating (3.0–10.0).
 * v2, used when ESPN's detailed player feed answers: built on minutes, goals, assists, xG/xA, key passes,
 * big chances, dribbles, carries, passing, duels, defensive actions and goalkeeping, plus the result.
 * v1 fallback uses only the basic box score. Everyone starts at 6.0 (v2) / 6.5 (v1).
 */
type Role = 'gk' | 'def' | 'mid' | 'fwd';

export function role(pos = ''): Role {
  const p = pos.toUpperCase().replace(/-[LRC]$/, '');
  if (p === 'G' || p === 'GK') return 'gk';
  if (['CD', 'CB', 'LB', 'RB', 'SW', 'D', 'LWB', 'RWB', 'WB'].includes(p)) return 'def';
  if (['F', 'CF', 'ST', 'S', 'LF', 'RF', 'FW'].includes(p)) return 'fwd';
  return 'mid';
}

export interface Part { label: string; value: number }
export interface RatingResult { rating?: number; parts: Part[] }

const cap = (v: number, max: number) => Math.max(-max, Math.min(max, v));
const r1 = (v: number) => Math.round(Math.min(10, Math.max(3, v)) * 10) / 10;

function v2(p: LineupPlayer, d: Record<string, number>, result: 'W' | 'D' | 'L' | undefined, teamConceded: number): RatingResult {
  const minutes = d.minutes ?? 0;
  if (minutes < 10 && !(d.totalGoals || d.goalAssists || d.redCards)) return { parts: [] };
  const r = role(p.position === 'SUB' ? undefined : p.position);
  const parts: Part[] = [];
  const add = (label: string, value: number) => {
    if (Math.abs(value) >= 0.01) parts.push({ label, value });
  };

  // Attack
  add('Goals', (d.totalGoals ?? 0) * (r === 'fwd' ? 1.0 : r === 'mid' ? 1.15 : 1.3));
  add('Assists', (d.goalAssists ?? 0) * 0.8);
  add('Expected goals (xG)', cap((d.expectedGoalsNonPenalty ?? d.expectedGoals ?? 0) * 0.35, 0.6));
  add('Expected assists (xA)', cap((d.expectedAssists ?? 0) * 0.6, 0.6));
  add('Key passes', cap((d.shotAssists ?? 0) * 0.14, 0.7));
  add('Big chances created', (d.bigChanceCreated ?? 0) * 0.22);
  add('Shots on target', (d.shotsOnTarget ?? 0) * 0.08);
  add('Big chances missed', -(d.bigChanceMissed ?? 0) * 0.15);
  add('Penalties missed', -(d.penaltyKicksMissed ?? 0) * 0.6);
  add('Woodwork', (d.shotsOnPost ?? 0) * 0.1);

  // Carrying and passing
  const dribbles = d.wonContest ?? 0;
  add('Dribbles', cap(dribbles * 0.12 - Math.max(0, (d.totalContest ?? 0) - dribbles) * 0.03, 0.8));
  add('Progressive carries', cap((d.progressiveCarries ?? 0) * 0.02, 0.35));
  add('Box entries', cap((d.penAreaEntries ?? 0) * 0.03 + (d.touchesInOppBox ?? 0) * 0.01, 0.3));
  const passes = d.totalPasses ?? 0;
  add('Passing', cap((d.accuratePasses ?? 0) * 0.005 + (passes >= 20 ? ((d.passPct ?? 0.8) - 0.8) * 1.5 : 0) + (d.successfulFinalThirdPasses ?? 0) * 0.008, 0.6));
  add('Crosses', cap((d.accurateCrosses ?? 0) * 0.06, 0.3));
  add('Turnovers', -cap((d.turnover ?? 0) * 0.025, 0.4));

  // Duels and defending
  add('Duels', cap((d.duelsWon ?? 0) * 0.035 - (d.duelsLost ?? 0) * 0.025, 0.5));
  add('Tackles won', cap((d.effectiveTackles ?? 0) * 0.1, 0.5));
  add('Interceptions', cap((d.interceptions ?? 0) * 0.1, 0.5));
  add('Recoveries', cap((d.ballRecovery ?? 0) * 0.03, 0.3));
  add('Clearances', cap((d.effectiveClearance ?? 0) * (r === 'def' ? 0.04 : 0.02), 0.35));
  add('Blocks', cap((d.outfielderBlock ?? 0) * 0.08, 0.3));

  // Discipline
  add('Fouls', (d.foulsSuffered ?? 0) * 0.04 - (d.foulsCommitted ?? 0) * 0.08);
  add('Cards', -((d.yellowCards ?? 0) * 0.3 + (d.redCards ?? 0) * 1.5));
  add('Own goals', -(d.ownGoals ?? 0) * 0.8);
  add('Penalty conceded', -(d.penaltyKickConceded ?? 0) * 0.5);

  // Goalkeeping and clean sheets
  const conceded = d.goalsConceded ?? teamConceded;
  if (r === 'gk') {
    add('Saves', (d.saves ?? 0) * 0.22);
    add('Goals prevented', cap((d.goalsPrevented ?? 0) * 0.45, 1));
    add('Goals conceded', -conceded * 0.2);
    add('Clean sheet', conceded === 0 && minutes >= 60 ? 0.5 : 0);
  } else if (r === 'def') {
    add('Goals conceded', -conceded * 0.1);
    add('Clean sheet', conceded === 0 && minutes >= 60 ? 0.3 : 0);
  }

  add('Result', result === 'W' ? 0.2 : result === 'L' ? -0.15 : 0);

  let delta = parts.reduce((t, x) => t + x.value, 0);
  // Short appearances carry less evidence.
  if (minutes < 30) delta *= 0.6 + (minutes / 30) * 0.4;
  return { rating: r1(6.0 + delta), parts: parts.sort((a, b) => Math.abs(b.value) - Math.abs(a.value)) };
}

function v1(p: LineupPlayer, result: 'W' | 'D' | 'L' | undefined, teamConceded: number): RatingResult {
  const s = p.stats;
  const r = role(p.position === 'SUB' ? undefined : p.position);
  const sot = s.shotsOnTarget ?? 0;
  const conceded = s.goalsConceded ?? (r === 'gk' || r === 'def' ? teamConceded : 0);
  const parts: Part[] = [];
  const add = (label: string, value: number) => Math.abs(value) >= 0.01 && parts.push({ label, value });
  add('Goals', (s.totalGoals ?? 0) * (r === 'fwd' ? 0.9 : r === 'mid' ? 1.0 : 1.2));
  add('Assists', (s.goalAssists ?? 0) * 0.7);
  add('Shots', sot * 0.15 + Math.max(0, (s.totalShots ?? 0) - sot) * 0.04);
  add('Fouls', (s.foulsSuffered ?? 0) * 0.08 - (s.foulsCommitted ?? 0) * 0.1);
  add('Cards', -((s.yellowCards ?? 0) * 0.3 + (s.redCards ?? 0) * 1.5 + (s.ownGoals ?? 0)));
  if (r === 'gk') {
    add('Saves', (s.saves ?? 0) * 0.25);
    add('Goals conceded', -conceded * 0.35);
    add('Clean sheet', conceded === 0 && p.starter && !p.subbedOut ? 0.6 : 0);
  } else if (r === 'def') {
    add('Goals conceded', -conceded * 0.15);
    add('Clean sheet', conceded === 0 && p.starter && !p.subbedOut ? 0.4 : 0);
  }
  add('Result', result === 'W' ? 0.3 : result === 'L' ? -0.2 : 0);
  let delta = parts.reduce((t, x) => t + x.value, 0);
  if (p.subbedIn) delta *= 0.7;
  return { rating: r1(6.5 + delta), parts };
}

export function ratePlayer(p: LineupPlayer, result: 'W' | 'D' | 'L' | undefined, teamConceded: number): RatingResult {
  if (!p.starter && !p.subbedIn) return { parts: [] };
  return p.detail ? v2(p, p.detail, result, teamConceded) : v1(p, result, teamConceded);
}

export function rateLineups(lineups: Lineup[], m: Match): Lineup[] {
  if (m.state === 'pre') return lineups;
  const hs = Number(m.home.score ?? 0);
  const as = Number(m.away.score ?? 0);
  return lineups.map((l) => {
    const mine = l.side === 'home' ? hs : as;
    const theirs = l.side === 'home' ? as : hs;
    const result = m.state === 'post' ? (mine > theirs ? 'W' : mine < theirs ? 'L' : 'D') : undefined;
    return {
      ...l,
      players: l.players.map((p) => {
        const rr = ratePlayer(p, result, theirs);
        return { ...p, rating: rr.rating, ratingParts: rr.parts };
      }),
    };
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
