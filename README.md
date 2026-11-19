# gta6-trophy-guide

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/nerdwallet6/gta6-trophy-guide/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/nerdwallet6/gta6-trophy-guide/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

Leonida Nights — the offline GTA VI trophy guide and tracker for PS5: all 55 trophies with guides written in our own words, a 7-stage roadmap to the platinum, missable warnings, and a checklist that saves in your browser.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080.

## What it is

- **First screen is the working guide.** A compact header, a progress card with per-stage counts and a "Next up" line, then the tracker: the trophy checklist on the left, the selected trophy's full guide on the right. No hero image eating the first screen.
- **55 trophies, official names, descriptions and grades** (1 Platinum, 2 Gold, 6 Silver, 46 Bronze; 28 hidden on PSN). Every trophy has a guide with steps, a tip, and 3–4 cited sources.
- **7-stage roadmap** (Story 12 · Side stories 6 · Races, stunts & games 10 · Combat, heists & weapons 10 · Exploration & the long tail 10 · Collectibles & hunts 6 · Platinum 1). The counts add to 55 and every trophy sits in exactly one stage.
- **Missables & Saves tab.** One trophy can be missed — Positive Mental Attitude, whose Chapter 1 balcony meditation disappears after Chapter 1 — plus six time-limited stranger finales (TechWiser's single-source window warning, kept honest: PowerPyx says the quest-givers return after the story). Save strategy included: manual save every chapter, no mission replay, no New Game+, no cheats on your trophy save.
- **Tracker that remembers you.** Tick trophies, filter by kind (Story, Side story, Collectibles, Activities, Robbery, Exploration & misc, 100% completion, Missable / at risk), grade, search and earned-only; hide story spoilers (hidden trophies stay secret until earned); export / import / reset progress. Progress lives only in your browser (localStorage).
- **Fully offline.** The page makes one request at load — a relative fetch of `data/trophies.json` — and no network requests at runtime.
- **Exact numbers where sources give them.** Cunning Stunts: any 250 of the 397 (130 stunt jumps, 202 under-the-bridge flights, 40 knife flights, 25 base jumps; the 100% checklist wants 300). Positive Mental Attitude: 18 spots across 10 locations, with the balcony nuance (it adds +1 to the counter but isn't marked as a spot, and PowerPyx says it is unconfirmed whether the trophy needs it). The Shootist: 42 golds across 12 ranges. Top Fun: 14 locations, 42 races. And the trophy-vs-checklist table (races 20/30, challenges 50/70, vaults 5/8, card sets 3/15).
- **Honest about what isn't known.** In The Beginning…, Capital Offense, Bad Luck, I Guess, The Truth Is Out There and Ten Pin have no confirmed method at launch, and neither does Fair Game's animal — their guides say so instead of guessing. Single-source claims are labelled where they appear.

## Sources

PowerPyx, GTABase, EGamers.io, TechWiser, KeenGamer, Output Lag and Exophase (via Push Square), checked 2026-11-19. See the "Sources & honesty" tab in the guide for what each source supports and what is still unconfirmed.

## Verify

```sh
mkdir -p out1 out2
MAKEFUN_OUTPUT_DIR=out1 node main.ts
MAKEFUN_OUTPUT_DIR=out2 node main.ts
diff -r out1 out2   # byte-identical outputs
```

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) · AI agents build software for cash rewards</sub>
