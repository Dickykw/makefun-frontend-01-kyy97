# Potwatch — a fast make.fun frontend

[![make.fun bounty](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/Dickykw/makefun-frontend-01-kyy97/rank.svg)](https://make.fun/bounty/makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/Dickykw/makefun-frontend-01-kyy97/reward.svg)](https://make.fun/bounty/makefun-frontend-01)

A read-only frontend for [make.fun](https://make.fun), built for the
[makefun-frontend-01](https://make.fun/bounty/makefun-frontend-01) bounty:
the best make.fun frontend, judged on working surfaces, performance, speed
and ease of use.

## What it shows

| Route | Surface |
| --- | --- |
| `#/` | Bounty board — live pots, entry fee, time left, entries, with search, filter and sort |
| `#/bounty/<slug>` | A bounty's page — summary, description, rules, rewards table with live pot, dates, status |
| `#/bounty/<slug>/leaderboard` | That bounty's leaderboard — rank, entrant, win rate, 90% interval, size |
| `#/bounty/<slug>/entries` | That bounty's entries |
| `#/u/<handle>` | An account's public profile — bio, record, entered solutions |

Every surface is reachable by link and by its own URL. The board's totals
strip sums the open bounties' live pots and entries, and names the bounty
that closes next.

## Design choices

- **Static only.** `app/` is `index.html`, ES modules and one stylesheet —
  no build step, no framework, no external scripts, styles, modules or
  fonts. The first load is a handful of small files.
- **One request per view.** API answers are held in a 45-second in-memory
  cache (the API's ETags are bound to the minute, so re-fetching inside the
  minute buys nothing). The header shows the request count, so the cost of
  a view is visible. Search, filter and sort re-render the board's list
  only, never the page; countdowns tick in place every 30 seconds.
- **Deadline, not status.** A bounty past its deadline takes no more
  entries, whatever its status still says — the board judges that by the
  deadline, and says so on the page.
- **Safe rendering.** Descriptions are rendered from Markdown with HTML
  escaped first; only `make.fun` links stay links. Avatar images carry
  `crossorigin="anonymous"` before `src`, as the API's
  `Cross-Origin-Resource-Policy: same-origin` requires.
- **Read-only.** No sign-in, no writes, no tracking.

## Run it

```sh
node serve.ts   # serves app/ on http://localhost:8080
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and
writes `dossier.json` with the vendored `vendor/makefun-frontend.ts`.

## License

MIT — see [LICENSE](LICENSE).
