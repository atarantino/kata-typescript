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

This port moves the catalog, generator, cleanup script, and configuration to TypeScript, replaces Jest with Vitest 3, and updates the project to TypeScript 5, Prettier 3, and `tsx`.

The original kata-machine is Copyright (c) ThePrimeagen and distributed under the MIT License. This TypeScript port retains that attribution and is also MIT-licensed.
