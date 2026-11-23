// Provider-neutral shapes. Every data source (ESPN today, others later) is mapped into these,
// so the UI never touches raw API payloads.

export type MatchState = 'pre' | 'in' | 'post';

export interface Team {
  id: string;
  name: string;
  short: string;
  abbr: string;
  logo?: string;
  color?: string;
  alt?: string;
}

export interface Side {
  team: Team;
  score?: string;
  winner?: boolean;
  redCards: number;
  shootout?: number;
}

export interface Incident {
  minute: string;
  kind: 'goal' | 'own-goal' | 'penalty-goal' | 'penalty-miss' | 'yellow' | 'red' | 'sub' | 'period' | 'var' | 'other';
  side?: 'home' | 'away';
  player?: string;
  secondary?: string; // assist or player subbed off
  playerId?: string;
  secondaryId?: string;
  text: string;
}

export interface Match {
  id: string;
  sport: string;
  leagueId: string;
  leagueSlug: string;
  date: string; // ISO
  state: MatchState;
  /** Short status for list rows: 67', HT, FT, Postp. */
  status: string;
  /** Longer status for headers: "Second Half", "Full Time". */
  statusLong: string;
  cancelled: boolean;
  home: Side;
  away: Side;
  venue?: string;
  note?: string;
  goals: Incident[];
}

export interface League {
  id: string;
  slug: string;
  name: string;
  short: string;
  logo?: string;
  hasStandings: boolean;
}

export interface StandingRow {
  rank: number;
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  noteColor?: string;
  note?: string;
}

export interface StandingGroup {
  name: string;
  rows: StandingRow[];
}

export interface StatPair {
  key: string;
  label: string;
  home: number;
  away: number;
  homeText: string;
  awayText: string;
  /** true when the value is a percentage share (possession). */
  share?: boolean;
}

export interface LineupPlayer {
  id: string;
  name: string;
  short: string;
  jersey?: string;
  position?: string;
  starter: boolean;
  formationPlace?: number;
  subbedIn?: boolean;
  subbedOut?: boolean;
  goals: number;
  yellow: boolean;
  red: boolean;
  /** Raw per-match stats from the provider (totalGoals, goalAssists, shotsOnTarget, saves, …). */
  stats: Record<string, number>;
  /** Detailed per-match stats (xG, passes, duels…) when the detailed feed answered. */
  detail?: Record<string, number>;
  /** DiDa rating 3.0–10.0, undefined when the player didn't play. */
  rating?: number;
  ratingParts?: { label: string; value: number }[];
}

export interface Lineup {
  side: 'home' | 'away';
  team: Team;
  formation?: string;
  players: LineupPlayer[];
}

export interface MiniResult {
  id: string;
  date: string;
  opponent: Team;
  homeAway: 'home' | 'away';
  score?: string;
  result?: 'W' | 'D' | 'L';
  league?: string;
}

export interface MatchDetail {
  match: Match;
  league: League;
  incidents: Incident[];
  stats: StatPair[];
  lineups: Lineup[];
  attendance?: number;
  referee?: string;
  form: { side: 'home' | 'away'; team: Team; games: MiniResult[] }[];
  h2h: MiniResult[];
}

export interface TeamSchedule {
  team: Team;
  standingSummary?: string;
  upcoming: Match[];
  results: Match[];
}

export interface Scorer {
  id: string;
  name: string;
  team: Team;
  goals: number;
  matches?: number;
  assists?: number;
  league: string; // slug
  leagueName?: string;
  factor?: number;
  points?: number;
}
