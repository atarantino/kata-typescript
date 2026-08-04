import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

import ligmaConfig from "./ligma.config";

const root = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(root, "src");
const current = "current";
const testFiles = [...new Set(ligmaConfig.dsa)]
    .filter((name) => existsSync(path.join(src, current, `${name}.ts`)))
    .map((name) => `src/__tests__/${name}.ts`);
testFiles.push("scripts/__tests__/due.test.ts");

export default defineConfig({
    test: {
        globals: true,
        include: testFiles,
    },
    resolve: {
        alias: {
            "@code": path.join(src, current),
        },
    },
});
