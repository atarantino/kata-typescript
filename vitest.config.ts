import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

import ligmaConfig from "./ligma.config";

const root = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(root, "src");

function latestDay(): string {
    const days = readdirSync(src, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => /^day(\d+)$/.exec(entry.name))
        .filter((match): match is RegExpExecArray => match !== null)
        .sort((a, b) => Number(b[1]) - Number(a[1]));

    return days[0]?.[0] ?? "day1";
}

const day = latestDay();
const testFiles = [...new Set(ligmaConfig.dsa)]
    .filter((name) => existsSync(path.join(src, day, `${name}.ts`)))
    .map((name) => `src/__tests__/${name}.ts`);
testFiles.push("scripts/__tests__/due.test.ts");

export default defineConfig({
    test: {
        globals: true,
        include: testFiles,
    },
    resolve: {
        alias: {
            "@code": path.join(src, day),
        },
    },
});
