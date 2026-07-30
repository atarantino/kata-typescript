# kata-typescript

A TypeScript DSA practice harness based on [ThePrimeagen/kata-machine](https://github.com/ThePrimeagen/kata-machine). Generate a fresh set of typed kata stubs each day, implement them, and use the original test suite for feedback.

## Usage

```sh
npm install
npm run generate
# Implement the stubs in src/dayN
npm test
npm run clear
```

Edit `ligma.config.ts` to choose the daily katas. `npm test` runs only the matching files because `vitest.config.ts` derives its include list from that config. `npm run day` prints the current generated directory.

## Interval sync

Regenerating all 23 katas every day is massed practice. This repo can instead pair with [Interval](https://intervalreps.vercel.app), a spaced-repetition trainer that schedules each form on its own review curve — you re-implement only what's actually decaying, and grade the attempt in the app.

Setup:

1. In Interval, open the **Katas** tab and seed the 23 kata-machine forms.
2. Click **Sync** in the app header to enable cross-device sync. The pairing link it gives you ends in `#k=<key>`.
3. Copy `.env.example` to `.env` in this repo and set `KATA_SYNC_KEY=<key>`.

Then:

```sh
npm run due              # table of every form and when it's next due
npm run due -- --generate  # scaffold stubs for exactly the forms that are due
```

Implement the generated stubs until vitest passes, then grade the attempt in Interval's Katas tab (*Instant* / *Had to think* / *Blanked*) — that's what schedules the next rep. Each kata in the app links back to the chapter of [The Last Algorithms Course You'll Need](https://master.dev/courses/algorithms/) that builds it.

The sync key is a 128-bit capability: anyone holding it can read and write your training state, so keep `.env` out of version control (it's gitignored here).

This port moves the catalog, generator, cleanup script, and configuration to TypeScript, replaces Jest with Vitest 3, and updates the project to TypeScript 5, Prettier 3, and `tsx`.

The original kata-machine is Copyright (c) ThePrimeagen and distributed under the MIT License. This TypeScript port retains that attribution and is also MIT-licensed.
