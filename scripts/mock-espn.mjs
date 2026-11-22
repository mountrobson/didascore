// Offline ESPN-shaped fixtures for UI tests (screenshots in CI / sandboxes without ESPN access).
const now = Date.now();
const iso = (minsFromNow) => new Date(now + minsFromNow * 60000).toISOString().replace(/:\d\d\.\d+Z$/, 'Z');
const T = (id, name, abbr, color) => ({ id, displayName: name, shortDisplayName: name.replace(/ (City|United|FC|Hove Albion)$/, ''), abbreviation: abbr, color });
const teams = {
  liv: T('364', 'Liverpool', 'LIV', 'd11317'), mun: T('360', 'Manchester United', 'MUN', 'da020e'),
  hul: T('306', 'Hull City', 'HUL', 'f28800'), bha: T('331', 'Brighton & Hove Albion', 'BHA', '0057b8'),
  bre: T('337', 'Brentford', 'BRE', 'e30613'), eve: T('368', 'Everton', 'EVE', '003399'),
  bar: T('83', 'Barcelona', 'BAR', 'a50044'), vil: T('102', 'Villarreal', 'VIL', 'ffe667'),
  get: T('2922', 'Getafe', 'GET', '005999'), atm: T('1068', 'Atlético Madrid', 'ATM', 'cb3524'),
  ata: T('105', 'Atalanta', 'ATA', '1e71b8'), int: T('110', 'Internazionale', 'INT', '0068a8'),
  om: T('176', 'Marseille', 'OLM', '2faee0'), lem: T('2697', 'Le Mans', 'MNS', 'cc0000'),
  nsh: T('18986', 'Nashville SC', 'NSH', 'ece83a'), cin: T('18267', 'FC Cincinnati', 'CIN', 'f05323'),
};
const st = (state, name, clock, short, desc) => ({ displayClock: clock, type: { state, name, shortDetail: short, description: desc, completed: state === 'post' } });
const ev = (id, lg, mins, status, h, a, hs, as, details = []) => ({
  id, uid: `s:600~l:${lg}~e:${id}`, date: iso(mins), status,
  competitions: [{ status, venue: { fullName: 'Stadium' }, details, competitors: [
    { homeAway: 'home', score: hs, winner: status.type.state === 'post' ? +hs > +as : false, team: h },
    { homeAway: 'away', score: as, winner: status.type.state === 'post' ? +as > +hs : false, team: a },
  ] }],
});
const goal = (min, tid, who, extra = {}) => ({ clock: { displayValue: min }, team: { id: tid }, scoringPlay: true, redCard: false, athletesInvolved: [{ shortName: who }], ...extra });
const red = (min, tid, who) => ({ clock: { displayValue: min }, team: { id: tid }, scoringPlay: false, redCard: true, athletesInvolved: [{ shortName: who }] });

export const scoreboard = { events: [
  ev('1', '730', -14, st('in', 'STATUS_FIRST_HALF', "14'", "14'", 'First Half'), teams.ata, teams.int, '0', '1', [goal("9'", '110', 'L. Martínez')]),
  ev('2', '710', -13, st('in', 'STATUS_HALFTIME', "45'+2'", 'HT', 'Halftime'), teams.om, teams.lem, '2', '0', [goal("12'", '176', 'M. Greenwood'), goal("40'", '176', 'A. Gouiri')]),
  ev('3', '700', -340, st('post', 'STATUS_FULL_TIME', "90'+6'", 'FT', 'Full Time'), teams.hul, teams.bha, '2', '0', [red("89'", '331', 'Costinha'), goal("90'+2'", '306', 'O. McBurnie'), goal("90'+5'", '306', 'O. McBurnie')]),
  ev('401878755', '700', -200, st('post', 'STATUS_FULL_TIME', "90'+3'", 'FT', 'Full Time'), teams.liv, teams.mun, '4', '0', [red("8'", '360', 'L. Yoro'), goal("10'", '364', 'D. Szoboszlai'), goal("13'", '364', 'F. Wirtz'), goal("66'", '364', 'R. Ngumoha'), goal("82'", '364', 'V. Muñoz')]),
  ev('5', '700', 30, st('pre', 'STATUS_SCHEDULED', "0'", 'Scheduled', 'Scheduled'), teams.bre, teams.eve, '0', '0'),
  ev('6', '740', -420, st('post', 'STATUS_FULL_TIME', "90'+6'", 'FT', 'Full Time'), teams.bar, teams.vil, '3', '2', [goal("5'", '102', 'T. Buchanan'), goal("57'", '83', 'G. Martín'), goal("67'", '83', 'P. Navarro', { ownGoal: true }), red("75'", '83', 'F. López')]),
  ev('7', '740', 25, st('pre', 'STATUS_POSTPONED', "0'", 'Postponed', 'Postponed'), teams.get, teams.atm, '0', '0'),
  ev('8', '770', 75, st('pre', 'STATUS_SCHEDULED', "0'", 'Scheduled', 'Scheduled'), teams.nsh, teams.cin, '0', '0'),
] };

export const leagues = { leagues: [
  { id: '700', slug: 'eng.1', name: 'English Premier League', shortName: 'Premier League', hasStandings: true },
  { id: '740', slug: 'esp.1', name: 'Spanish LALIGA', shortName: 'LALIGA', hasStandings: true },
  { id: '730', slug: 'ita.1', name: 'Italian Serie A', shortName: 'Serie A', hasStandings: true },
  { id: '710', slug: 'fra.1', name: 'French Ligue 1', shortName: 'Ligue 1', hasStandings: true },
  { id: '770', slug: 'usa.1', name: 'MLS', shortName: 'MLS', hasStandings: true },
  { id: '775', slug: 'uefa.champions', name: 'UEFA Champions League', shortName: 'Champions League', hasStandings: true },
] };

const P = (id, last, jersey, pos, fp, starter, extra = {}) => ({ starter, jersey, athlete: { id, displayName: last, lastName: last }, position: { abbreviation: pos }, formationPlace: String(fp), subbedIn: false, subbedOut: false, stats: [], ...extra });
const g = (n) => [{ name: 'totalGoals', value: n }];
export const summary = {
  header: { uid: 's:600~l:700~e:401878755', league: { id: '700', slug: 'eng.1', name: 'English Premier League', abbreviation: 'Premier League' },
    competitions: [{ date: iso(-200), status: st('post', 'STATUS_FULL_TIME', "90'+3'", 'FT', 'Full Time'), competitors: [
      { homeAway: 'home', score: '4', winner: true, team: teams.liv }, { homeAway: 'away', score: '0', winner: false, team: teams.mun }] }] },
  keyEvents: [
    { type: { type: 'kickoff' }, text: 'First Half begins.', clock: { displayValue: '' } },
    { type: { type: 'red-card' }, clock: { displayValue: "8'" }, team: { id: '360' }, participants: [{ athlete: { displayName: 'Leny Yoro' } }] },
    { type: { type: 'goal---free-kick' }, scoringPlay: true, clock: { displayValue: "10'" }, team: { id: '364' }, participants: [{ athlete: { displayName: 'Dominik Szoboszlai' } }] },
    { type: { type: 'goal' }, scoringPlay: true, clock: { displayValue: "13'" }, team: { id: '364' }, participants: [{ athlete: { displayName: 'Florian Wirtz' } }, { athlete: { displayName: 'Rio Ngumoha' } }] },
    { type: { type: 'substitution' }, clock: { displayValue: "22'" }, team: { id: '360' }, participants: [{ athlete: { displayName: 'Harry Maguire' } }, { athlete: { displayName: 'Bryan Mbeumo' } }] },
    { type: { type: 'halftime' }, text: 'First Half ends.', clock: { displayValue: "45'+5'" } },
    { type: { type: 'yellow-card' }, clock: { displayValue: "62'" }, team: { id: '364' }, participants: [{ athlete: { displayName: 'Bradley Barcola' } }] },
    { type: { type: 'goal' }, scoringPlay: true, clock: { displayValue: "66'" }, team: { id: '364' }, participants: [{ athlete: { displayName: 'Rio Ngumoha' } }, { athlete: { displayName: 'Bradley Barcola' } }] },
    { type: { type: 'goal' }, scoringPlay: true, clock: { displayValue: "82'" }, team: { id: '364' }, participants: [{ athlete: { displayName: 'Víctor Muñoz' } }, { athlete: { displayName: 'Florian Wirtz' } }] },
    { type: { type: 'end-regular-time' }, text: 'Match ends.', clock: { displayValue: "90'+3'" } },
  ],
  boxscore: { teams: [
    { team: { id: '364' }, statistics: [['possessionPct', '64.2'], ['totalShots', '28'], ['shotsOnTarget', '11'], ['wonCorners', '15'], ['foulsCommitted', '9'], ['yellowCards', '1'], ['redCards', '0'], ['saves', '3'], ['totalPasses', '612'], ['passPct', '0.9']].map(([name, displayValue]) => ({ name, displayValue })) },
    { team: { id: '360' }, statistics: [['possessionPct', '35.8'], ['totalShots', '10'], ['shotsOnTarget', '3'], ['wonCorners', '5'], ['foulsCommitted', '14'], ['yellowCards', '3'], ['redCards', '1'], ['saves', '7'], ['totalPasses', '331'], ['passPct', '0.8']].map(([name, displayValue]) => ({ name, displayValue })) },
  ] },
  rosters: [
    { homeAway: 'home', formation: '4-2-3-1', team: teams.liv, roster: [
      P('a1', 'Becker', '1', 'G', 1, true), P('a2', 'Araujo', '2', 'RB', 2, true), P('a3', 'Kerkez', '6', 'LB', 3, true), P('a4', 'Mac Allister', '10', 'LM', 4, true, { subbedOut: true }),
      P('a5', 'Jacquet', '5', 'CD-R', 5, true), P('a6', 'van Dijk', '4', 'CD-L', 6, true), P('a7', 'Barcola', '29', 'AM-R', 7, true, { subbedOut: true, stats: [{ name: 'yellowCards', value: 1 }] }),
      P('a8', 'Szoboszlai', '8', 'RM', 8, true, { stats: g(1) }), P('a9', 'Isak', '9', 'F', 9, true), P('a10', 'Wirtz', '7', 'AM', 10, true, { stats: g(1) }), P('a11', 'Ngumoha', '73', 'AM-L', 11, true, { stats: g(1) }),
      P('a12', 'Muñoz', '23', 'SUB', 0, false, { subbedIn: true, stats: g(1) }), P('a13', 'Nyoni', '42', 'SUB', 0, false, { subbedIn: true }), P('a14', 'Mamardashvili', '25', 'SUB', 0, false),
    ] },
    { homeAway: 'away', formation: '4-2-3-1', team: teams.mun, roster: [
      P('b1', 'Lammens', '31', 'G', 1, true), P('b2', 'Dalot', '2', 'RB', 2, true), P('b3', 'Martínez', '6', 'LB', 3, true), P('b4', 'Mainoo', '37', 'LM', 4, true),
      P('b5', 'Yoro', '15', 'CD-R', 5, true, { stats: [{ name: 'redCards', value: 1 }] }), P('b6', 'de Ligt', '4', 'CD-L', 6, true), P('b7', 'Mbeumo', '19', 'AM-R', 7, true, { subbedOut: true }),
      P('b8', 'Tielemans', '8', 'RM', 8, true), P('b9', 'Cunha', '10', 'F', 9, true), P('b10', 'Fernandes', '18', 'AM', 10, true), P('b11', 'Dorgu', '13', 'AM-L', 11, true),
      P('b12', 'Maguire', '5', 'SUB', 0, false, { subbedIn: true }),
    ] },
  ],
  gameInfo: { venue: { fullName: 'Anfield', address: { city: 'Liverpool' } }, attendance: 60725 },
  lastFiveGames: [
    { team: teams.liv, events: ['W:2-0', 'D:1-1', 'L:0-1', 'W:3-2', 'W:3-1'].map((x, i) => ({ id: 'l' + i, gameDate: iso(-10080 * (i + 1)), score: x.split(':')[1], gameResult: x[0], homeTeamId: i % 2 ? '364' : '0', opponent: Object.values(teams)[i + 4], leagueName: 'Premier League' })) },
    { team: teams.mun, events: ['L:1-4', 'L:0-3', 'L:0-2', 'W:3-2', 'D:4-4'].map((x, i) => ({ id: 'm' + i, gameDate: iso(-10080 * (i + 1)), score: x.split(':')[1], gameResult: x[0], homeTeamId: i % 2 ? '360' : '0', opponent: Object.values(teams)[i + 8], leagueName: 'Premier League' })) },
  ],
};

const names = ['Arsenal', 'Brighton', 'Manchester City', 'Liverpool', 'Chelsea', 'Aston Villa', 'Newcastle United', 'Tottenham', 'Brentford', 'Fulham', 'Hull City', 'Everton', 'Bournemouth', 'Crystal Palace', 'Nottingham Forest', 'West Ham', 'Manchester United', 'Leeds', 'Burnley', 'Sunderland'];
export const standings = { children: [{ name: '2026-27 English Premier League', standings: { entries: names.map((n, i) => ({
  team: { id: n === 'Liverpool' ? '364' : n === 'Manchester United' ? '360' : String(900 + i), displayName: n, shortDisplayName: n.replace(/ (City|United)$/, ''), abbreviation: n.slice(0, 3).toUpperCase() },
  note: i < 4 ? { color: '#81D6AC', description: 'Champions League' } : i === 4 ? { color: '#B2D7F5', description: 'Europa League' } : i > 16 ? { color: '#FF7F84', description: 'Relegation' } : undefined,
  stats: [['rank', i + 1], ['gamesPlayed', 11], ['wins', 9 - Math.floor(i / 2.5)], ['ties', i % 3], ['losses', Math.floor(i / 2)], ['pointsFor', 26 - i], ['pointsAgainst', 7 + i], ['pointDifferential', 19 - 2 * i], ['points', 28 - Math.floor(i * 1.2)]].map(([name, value]) => ({ name, value })),
})) } }] };

export const teamInfo = { team: { ...teams.liv, standingSummary: '4th in English Premier League' } };
export const teamSchedule = { team: teams.liv, events: scoreboard.events.filter((e) => e.id === '401878755') };
export const teamFixtures = { team: teams.liv, events: [ev('f1', '700', 7 * 1440, st('pre', 'STATUS_SCHEDULED', "0'", 'Scheduled', 'Scheduled'), teams.eve, teams.liv, '0', '0')] };
export const leagueTeams = { sports: [{ leagues: [{ teams: Object.values(teams).map((t) => ({ team: t })) }] }] };
export const calendar = { events: [], leagues: [{ calendar: [iso(-1440 * 7), iso(-200), iso(30), iso(7 * 1440)] }] };

export function route(url) {
  const u = new URL(url);
  const p = u.pathname;
  if (p.includes('/leagues/dropdown')) return leagues;
  if (p.endsWith('/summary')) return summary;
  if (p.endsWith('/standings')) return standings;
  if (p.match(/\/teams\/\d+\/schedule$/)) return u.searchParams.get('fixture') ? teamFixtures : teamSchedule;
  if (p.match(/\/teams\/\d+$/)) return teamInfo;
  if (p.endsWith('/teams')) return leagueTeams;
  if (p.endsWith('/scoreboard')) {
    if (!u.searchParams.get('dates')) return calendar;
    const slug = p.split('/').slice(-2, -1)[0];
    if (slug === 'all') return scoreboard;
    const lid = leagues.leagues.find((l) => l.slug === slug)?.id;
    return { events: scoreboard.events.filter((e) => e.uid.includes(`l:${lid}~`)) };
  }
  return { events: [] };
}
