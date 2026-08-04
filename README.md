# kata-typescript

A TypeScript DSA practice harness based on [ThePrimeagen/kata-machine](https://github.com/ThePrimeagen/kata-machine). Generate a fresh set of typed kata stubs each day, implement them, and use the original test suite for feedback.

## Usage

```sh
npm install
npm run generate
# Implement the stubs in src/current
npm test
npm run clear
```

`npm run clear` archives your work before deleting it — see [Attempts](#attempts).

Edit `ligma.config.ts` to choose the daily katas. `npm test` runs only the matching files because `vitest.config.ts` derives its include list from that config. `npm run day` prints the current generated directory.

### Study loop

```sh
npm run due -- --generate  # generate today's Interval exercises
npm run day                # print the directory to work in
npm test                   # repeat while implementing the stubs
npm run clear              # archive the attempt and reset
```

After the tests pass, grade the attempt in Interval before clearing it. Use `npm run due -- --all` to see the full schedule, `npm run archive` to save without clearing, or `npm run generate -- BinarySearchList` to practice one kata directly. Run `npm run prettier` to format the repo. The `--` passes the remaining arguments to the underlying script.

## Attempts

`src/current` is gitignored and `npm run clear` deletes it, so implementations are throwaway by default. Before deleting, `clear` copies each one into `attempts/<Kata>/<date>-<result>.ts`, which _is_ committed:

```
attempts/
  BinarySearchList/
    2026-08-03-failing.ts
    2026-08-17-passing.ts
```

Untouched stubs are skipped, so only real work is kept. The result comes from a vitest run against `src/current`. Run `npm run archive` on its own to snapshot without deleting, or `npm run clear -- --no-archive` to skip it.

This deliberately isn't an answer key. A canonical solution sitting next to the exercise turns a retrieval rep into a recognition rep — the kata still feels done, you grade it _Had to think_, and the schedule drifts. Your own past attempt carries the same information but has to be dug for, and it's written in your idiom, so reading it reconstructs your reasoning rather than teaching you someone else's. Diffing two passing attempts weeks apart also shows what's actually consolidating, which the Instant/Had-to-think/Blanked grade can't capture.

## Interval sync

Regenerating all 23 katas every day is massed practice. This repo can instead pair with [Interval](https://intervalreps.vercel.app), a spaced-repetition trainer that schedules each form on its own review curve — you re-implement only what's actually decaying, and grade the attempt in the app.

Setup:

1. In Interval, open the **Katas** tab and seed the 23 kata-machine forms.
2. Click **Sync** in the app header to enable cross-device sync. The pairing link it gives you ends in `#k=<key>`.
3. Copy `.env.example` to `.env` in this repo and set `KATA_SYNC_KEY=<key>`.

Then:

```sh
npm run due                # today's work: reviews that are due, plus a couple of new forms
npm run due -- --generate  # scaffold stubs for exactly those
npm run due -- --all       # the full table, including forms not started yet
npm run due -- --new 5     # introduce more new forms today than usual
```

Unseen forms are introduced a couple per day rather than all at once, so a fresh seed doesn't hand you all 23 on day one. The rate comes from the app's `newPerDay` setting; `--new` overrides it for a single run. Reviews are never withheld — the cap only limits how fast _new_ forms enter rotation.

New forms enter in `ligma.config.ts` order, so that list doubles as the introduction ramp — reorder it to change which forms you meet first.

Implement the generated stubs until vitest passes, then grade the attempt in Interval's Katas tab (_Instant_ / _Had to think_ / _Blanked_) — that's what schedules the next rep. Each kata in the app links back to the chapter of [The Last Algorithms Course You'll Need](https://master.dev/courses/algorithms/) that builds it.

The sync key is a 128-bit capability: anyone holding it can read and write your training state, so keep `.env` out of version control (it's gitignored here).

This port moves the catalog, generator, cleanup script, and configuration to TypeScript, replaces Jest with Vitest 3, and updates the project to TypeScript 5, Prettier 3, and `tsx`.

The original kata-machine is Copyright (c) ThePrimeagen and distributed under the MIT License. This TypeScript port retains that attribution and is also MIT-licensed.
