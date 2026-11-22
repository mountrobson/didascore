/* eslint-disable @typescript-eslint/no-explicit-any */
import { getJSON } from './http';
import type { Scorer } from './types';

const SITE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';

/** Top scorers of one league (ESPN returns up to 50). */
export async function getTopScorers(slug: string): Promise<Scorer[]> {
  const r = await getJSON<any>(`${SITE}/${slug}/statistics`, 600_000);
  const goals = r.stats?.find((s: any) => s.name === 'goalsLeaders')?.leaders ?? [];
  const assists = new Map<string, number>((r.stats?.find((s: any) => s.name === 'assistsLeaders')?.leaders ?? []).map((l: any) => [String(l.athlete?.id), Number(l.value)]));
  return goals.map((l: any): Scorer => {
    const a = l.athlete ?? {};
    const sd: string = l.shortDisplayValue ?? '';
    const m = sd.match(/M:\s*(\d+)/);
    const as = sd.match(/A:\s*(\d+)/);
    return {
      id: String(a.id),
      name: a.displayName ?? '',
      team: {
        id: String(a.team?.id ?? ''),
        name: a.team?.displayName ?? '',
        short: a.team?.shortDisplayName ?? a.team?.displayName ?? '',
        abbr: a.team?.abbreviation ?? '',
        logo: a.team?.logos?.[0]?.href,
      },
      goals: Number(l.value ?? 0),
      matches: m ? Number(m[1]) : undefined,
      assists: as ? Number(as[1]) : assists.get(String(a.id)),
      league: slug,
      leagueName: r.league?.shortName || r.league?.name,
    };
  });
}

/**
 * European Golden Shoe: league goals x a weight set by the UEFA league ranking.
 * Leagues ranked 1-5 count double, 6-22 count 1.5, the rest 1.
 * The ranks below are an approximation of the current UEFA country coefficients.
 */
export const GOLDEN_SHOE_LEAGUES: { slug: string; factor: number }[] = [
  { slug: 'eng.1', factor: 2 }, { slug: 'esp.1', factor: 2 }, { slug: 'ita.1', factor: 2 }, { slug: 'ger.1', factor: 2 }, { slug: 'fra.1', factor: 2 },
  { slug: 'por.1', factor: 1.5 }, { slug: 'ned.1', factor: 1.5 }, { slug: 'bel.1', factor: 1.5 }, { slug: 'tur.1', factor: 1.5 }, { slug: 'gre.1', factor: 1.5 },
  { slug: 'nor.1', factor: 1.5 }, { slug: 'den.1', factor: 1.5 }, { slug: 'aut.1', factor: 1.5 }, { slug: 'sui.1', factor: 1.5 }, { slug: 'sco.1', factor: 1.5 },
  { slug: 'cyp.1', factor: 1.5 }, { slug: 'swe.1', factor: 1.5 },
  { slug: 'rus.1', factor: 1 },
];

export async function getGoldenShoe(): Promise<Scorer[]> {
  const lists = await Promise.all(
    GOLDEN_SHOE_LEAGUES.map(({ slug, factor }) =>
      getTopScorers(slug)
        .then((xs) => xs.map((x) => ({ ...x, factor, points: x.goals * factor })))
        .catch(() => [] as Scorer[])
    )
  );
  return lists
    .flat()
    .sort((a, b) => (b.points ?? 0) - (a.points ?? 0) || b.goals - a.goals || (a.matches ?? 99) - (b.matches ?? 99))
    .slice(0, 50);
}

export interface Contributor {
  id: string;
  name: string;
  goals: number;
  assists: number;
  matches?: number;
  /** Average DiDa rating over the club's recent matches the player played in. */
  form?: number;
  formGames?: number;
}

/** A club's top goal contributors (goals + assists) in one league, from the league leader boards. */
export async function getClubContributors(slug: string, teamId: string): Promise<Contributor[]> {
  const r = await getJSON<any>(`${SITE}/${slug}/statistics`, 600_000);
  const by = new Map<string, Contributor>();
  const take = (name: string, field: 'goals' | 'assists') => {
    for (const l of r.stats?.find((s: any) => s.name === name)?.leaders ?? []) {
      const a = l.athlete ?? {};
      if (String(a.team?.id) !== teamId) continue;
      const id = String(a.id);
      const c: Contributor = by.get(id) ?? { id, name: a.displayName ?? '', goals: 0, assists: 0 };
      c[field] = Number(l.value ?? 0);
      const m = String(l.shortDisplayValue ?? '').match(/M:\s*(\d+)/);
      if (m) c.matches = Math.max(c.matches ?? 0, Number(m[1]));
      by.set(id, c);
    }
  };
  take('goalsLeaders', 'goals');
  take('assistsLeaders', 'assists');
  return [...by.values()].sort((a, b) => b.goals + b.assists - (a.goals + a.assists) || b.goals - a.goals);
}
