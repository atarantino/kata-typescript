import {
    existsSync,
    mkdirSync,
    readFileSync,
    readdirSync,
    writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import config from "../ligma.config";
import dsa from "./dsa";
import { renderStub } from "./stub";

interface TsConfig {
    compilerOptions: {
        paths: Record<string, string[]>;
    };
    exclude?: string[];
}

const scriptsPath = path.dirname(fileURLToPath(import.meta.url));
const rootPath = path.join(scriptsPath, "..");
const srcPath = path.join(rootPath, "src");

const requestedNames = [...new Set(process.argv.slice(2))];
const validNames = Object.keys(dsa) as (keyof typeof dsa)[];
const validNameSet = new Set<string>(validNames);
const unknownNames = requestedNames.filter((name) => !validNameSet.has(name));

if (unknownNames.length > 0) {
    console.error(`Unknown kata name(s): ${unknownNames.join(", ")}`);
    console.error(`Valid kata names: ${validNames.join(", ")}`);
    process.exit(1);
}

const names =
    requestedNames.length > 0
        ? (requestedNames as (keyof typeof dsa)[])
        : config.dsa;

const currentName = "current";
const currentPath = path.join(srcPath, currentName);
const relativeCurrentPath = path.relative(process.cwd(), currentPath);

if (existsSync(currentPath)) {
    console.error(
        `${relativeCurrentPath} already exists; run npm run clear first`,
    );
    process.exit(1);
}

mkdirSync(currentPath);

for (const name of names) {
    writeFileSync(
        path.join(currentPath, `${name}.ts`),
        renderStub(name, dsa[name]),
    );
}

const tsconfigPath = path.join(rootPath, "tsconfig.json");
const tsconfig = JSON.parse(readFileSync(tsconfigPath, "utf8")) as TsConfig;
tsconfig.compilerOptions.paths["@code/*"] = [`./src/${currentName}/*`];

const configuredTests = new Set(names.map((name) => `${name}.ts`));
const excludedTests = readdirSync(path.join(srcPath, "__tests__"))
    .filter((name) => name.endsWith(".ts") && !configuredTests.has(name))
    .map((name) => `src/__tests__/${name}`);
tsconfig.exclude = ["node_modules", "dist", ...excludedTests];

writeFileSync(tsconfigPath, `${JSON.stringify(tsconfig, null, 4)}\n`);

const statsPath = path.join(rootPath, "stats.json");
const stats = existsSync(statsPath)
    ? (JSON.parse(readFileSync(statsPath, "utf8")) as Record<string, number>)
    : {};

for (const name of names) {
    stats[name] = (stats[name] ?? 0) + 1;
}

writeFileSync(statsPath, `${JSON.stringify(stats, null, 4)}\n`);

console.log(`generated ${relativeCurrentPath}`);
