import type { Lineup, LineupPlayer } from '../api/types';

// ESPN position codes look like G, CD-L, RB, LM, AM-R, F. Depth = distance from own goal.
function depth(pos = ''): number {
  const p = pos.toUpperCase().replace(/-[LRC]$/, '');
  if (p === 'G' || p === 'GK') return 0;
  if (['CD', 'CB', 'LB', 'RB', 'SW', 'D'].includes(p)) return 1;
  if (['LWB', 'RWB', 'WB'].includes(p)) return 1.5;
  if (['DM', 'CDM'].includes(p)) return 2;
  if (['CM', 'LM', 'RM', 'M'].includes(p)) return 2.5;
  if (['AM', 'CAM', 'LW', 'RW', 'W'].includes(p)) return 3;
  if (['F', 'CF', 'ST', 'S', 'LF', 'RF', 'FW'].includes(p)) return 4;
  return 2.5;
}
// Negative = left, positive = right (team's own view). Full-backs/wingers (LB, RW) sit wider than CD-L/AM-R.
function lateral(pos = ''): number {
  const p = pos.toUpperCase();
  if (/^L(B|WB|M|W|F)$/.test(p)) return -2;
  if (/^R(B|WB|M|W|F)$/.test(p)) return 2;
  if (/-L$/.test(p)) return -1;
  if (/-R$/.test(p)) return 1;
  return 0;
}

/** Splits the starting XI into lines using the formation string (e.g. 4-2-3-1) and position codes. */
function lines(l: Lineup): LineupPlayer[][] {
  const xi = l.players.filter((p) => p.starter);
  const shape = (l.formation ?? '').split('-').map(Number).filter((n) => n > 0);
  if (xi.length !== 11 || shape.reduce((a, b) => a + b, 0) !== 10) return [];
  const sorted = xi.slice().sort((a, b) => depth(a.position) - depth(b.position) || (a.formationPlace ?? 99) - (b.formationPlace ?? 99));
  const out: LineupPlayer[][] = [[sorted[0]]];
  let i = 1;
  for (const n of shape) {
    out.push(sorted.slice(i, i + n).sort((a, b) => lateral(a.position) - lateral(b.position)));
    i += n;
  }
  return out;
}

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) || 0);
const dist = (a: string, b: string) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]));
const isLight = (hex: string) => { const [r, g, b] = rgb(hex); return 0.299 * r + 0.587 * g + 0.114 * b > 170; };

function Dot({ p, color }: { p: LineupPlayer; color: string }) {
  return (
    <div className="pp">
      <span className="pp-shirt" style={{ background: color, color: isLight(color) ? '#0b0f14' : '#fff', textShadow: isLight(color) ? 'none' : undefined }}>
        {p.jersey}
        {p.goals > 0 && <span className="pp-badge goal" title={`${p.goals} goal${p.goals > 1 ? 's' : ''}`}>{p.goals > 1 ? p.goals : ''}</span>}
        {p.red ? <span className="pp-badge red" /> : p.yellow ? <span className="pp-badge yellow" /> : null}
        {p.subbedOut && <span className="pp-badge off" title="Substituted" />}
      </span>
      <span className="pp-name">{p.short}</span>
    </div>
  );
}

export function Pitch({ home, away }: { home: Lineup; away: Lineup }) {
  const hl = lines(home);
  const al = lines(away);
  if (!hl.length || !al.length) return null;
  const hc = home.team.color && home.team.color !== '#ffffff' ? home.team.color : '#3d7bff';
  let ac = away.team.color && away.team.color !== '#ffffff' ? away.team.color : '#ff7a3d';
  // Two similar kits (e.g. two reds) would be unreadable: show the away side in white.
  if (dist(ac, hc) < 110) ac = '#eef2f6';
  return (
    <div className="pitch" role="img" aria-label={`Lineups: ${home.team.name} ${home.formation}, ${away.team.name} ${away.formation}`}>
      <div className="pitch-lines" aria-hidden><span className="mid" /><span className="circle" /><span className="box top" /><span className="box bottom" /></div>
      <div className="half">
        {hl.map((row, i) => (
          <div className="prow" key={i}>{row.slice().reverse().map((p) => <Dot key={p.id} p={p} color={hc} />)}</div>
        ))}
      </div>
      <div className="half away">
        {al.slice().reverse().map((row, i) => (
          <div className="prow" key={i}>{row.map((p) => <Dot key={p.id} p={p} color={ac} />)}</div>
        ))}
      </div>
    </div>
  );
}
