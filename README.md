# DiDa Score

Fast, ad-free live football scores. Installable on your phone as an app (PWA), no account, no trackers.

## What it does

- **Scores**: every football match on a day, across 200+ competitions, grouped by league. Day picker, Live filter, Following filter. Auto-refreshes every 20 s while matches are live.
- **Your matches** float to the top. Star any team, league or match to follow it.
- **Goal alerts** for followed teams: an in-app toast plus an optional system notification while the app is open.
- **Match page**: score and scorers, timeline (goals, cards, subs), stats bars, lineups on a pitch with formation, live league table with both teams highlighted, recent form and head-to-head.
- **League page**: table with qualification/relegation colours, next and previous match days.
- **Team page**: next fixtures, recent results, form.
- **Search** clubs and competitions. **Settings**: light/dark/system theme, 12/24-hour clock, alerts.
- Works offline for the last data you loaded. Dark mode by default on dark-mode devices.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/
```

`dist/` is a static site with relative paths and hash routing, so it runs from any static host or sub-path: GitHub Pages, Netlify (drag `dist/` onto app.netlify.com/drop), Cloudflare Pages, Vercel. Open it on your phone and use "Add to Home Screen" to install.

## Data source and its limits

Data comes from ESPN's public JSON feeds (`site.api.espn.com`). They are free, need no key and allow browser requests (CORS `*`), so the app needs no backend.

- **Unofficial.** No SLA or terms granting use; ESPN can change or block them at any time. Fine for personal use; for a public/commercial app, swap in a licensed provider.
- **No xG, heatmaps, player ratings or momentum graphs** (ESPN doesn't publish them).
- **No date ranges**: the API rejects `dates=A-B`, so a day view costs 1–2 requests and a league's fixtures cost one request per match day.
- **Coverage** varies by league: top leagues have lineups and full stats; smaller ones may only have scores.
- Days are keyed by US Eastern time; the app merges the right ESPN days so "Today" matches your local day.

All provider code lives in `src/api/espn.ts` and maps into neutral types in `src/api/types.ts`. To switch provider (e.g. API-Football, football-data.org, Sportmonks), write another adapter with the same functions.

### Paid/keyed alternatives

| Provider | Free tier | Notes |
| --- | --- | --- |
| football-data.org | 10 req/min, ~12 top competitions, scores delayed on free tier | Needs a key; CORS blocked, so needs a small proxy |
| API-Football (api-sports.io) | 100 req/day | Rich (lineups, stats, odds); paid plans from ~$19/mo |
| TheSportsDB | Free key "3", limited live data | Live scores are a Patreon perk |

## Adding another sport

`src/sports.ts` already lists basketball, ice hockey, American football and baseball (disabled). ESPN uses the same scoreboard and standings shapes, so enabling one mostly means flipping `enabled`, adding a sport switcher to the Scores page, and hiding football-only tabs (lineups pitch). Match detail for other sports would want its own stats layout.

## Project layout

```
src/api/        espn.ts (adapter), types.ts (neutral model), http.ts (fetch cache)
src/pages/      Home, Match, League, Team, Following, Leagues (search), Settings
src/components/ MatchRow, DateStrip, Pitch, StandingsTable, Crest, Star, Toasts
src/lib/        store.ts (favorites/settings in localStorage), usePoll.ts, dates.ts
public/         manifest, service worker, icons
scripts/        mock-espn.mjs + screens.mjs: offline fixtures and screenshot run
```
