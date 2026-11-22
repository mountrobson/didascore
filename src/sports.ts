// Sport registry. To add a sport: add an entry here (ESPN path + featured leagues),
// and the scores list, league tables and team pages work with no other changes.
// Match-detail tabs that are football specific (lineups pitch) hide themselves for other sports.

export interface SportConfig {
  key: string;
  name: string;
  /** ESPN path segment, e.g. "soccer", "basketball". */
  espn: string;
  /** ESPN supports a single "all leagues" scoreboard for this sport. */
  hasAllScoreboard: boolean;
  /** Leagues shown first, in this order. For sports without an "all" scoreboard, these are the leagues fetched. */
  featured: string[];
  drawPossible: boolean;
  enabled: boolean;
}

export const SPORTS: SportConfig[] = [
  {
    key: 'soccer',
    name: 'Football',
    espn: 'soccer',
    hasAllScoreboard: true,
    featured: [
      'esp.1',
      'uefa.champions',
      'esp.copa_del_rey',
      'esp.super_cup',
      'esp.w.1',
      'fifa.world',
      'fifa.cwc',
      'eng.1',
      'ger.1',
      'ita.1',
      'fra.1',
      'uefa.europa',
      'uefa.europa.conf',
      'usa.1',
      'ned.1',
      'por.1',
      'eng.2',
      'eng.fa',
      'eng.league_cup',
      'sco.1',
      'tur.1',
      'bel.1',
      'mex.1',
      'bra.1',
      'arg.1',
      'ksa.1',
      'eng.w.1',
      'uefa.nations',
      'conmebol.libertadores',
    ],
    drawPossible: true,
    enabled: true,
  },
  // Ready for later: ESPN uses the same scoreboard / standings shape for these.
  { key: 'basketball', name: 'Basketball', espn: 'basketball', hasAllScoreboard: false, featured: ['nba', 'wnba', 'mens-college-basketball'], drawPossible: false, enabled: false },
  { key: 'hockey', name: 'Ice hockey', espn: 'hockey', hasAllScoreboard: false, featured: ['nhl'], drawPossible: false, enabled: false },
  { key: 'football', name: 'American football', espn: 'football', hasAllScoreboard: false, featured: ['nfl', 'college-football'], drawPossible: true, enabled: false },
  { key: 'baseball', name: 'Baseball', espn: 'baseball', hasAllScoreboard: false, featured: ['mlb'], drawPossible: false, enabled: false },
];

export const sportByKey = (key: string) => SPORTS.find((s) => s.key === key) ?? SPORTS[0];
export const DEFAULT_SPORT = 'soccer';
