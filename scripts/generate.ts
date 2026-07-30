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
import dsa, {
    type ClassSpec,
    type FunctionSpec,
    type GetterSpec,
    type MethodSpec,
    type PropertySpec,
} from "./dsa";

interface TsConfig {
    compilerOptions: {
        paths: Record<string, string[]>;
    };
    exclude?: string[];
}

interface PackageJson {
    scripts: Record<string, string>;
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

const previousDay = readdirSync(srcPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => /^day(\d+)$/.exec(entry.name))
    .filter((match): match is RegExpExecArray => match !== null)
    .reduce((highest, match) => Math.max(highest, Number(match[1])), 0);

const dayName = `day${previousDay + 1}`;
const dayPath = path.join(srcPath, dayName);
const relativeDayPath = path.relative(process.cwd(), dayPath);

mkdirSync(dayPath);

function generateMethod(method: MethodSpec): string {
    return `${method.name}(${method.args || ""}): ${method.return || "void"} {

}`;
}

function generateProperty(property: PropertySpec): string {
    return `${property.scope} ${property.name}: ${property.type};`;
}

function generateGetter(getter: GetterSpec): string {
    return `get ${getter.name}(): ${getter.return} {
    return this.${getter.prop_name};
}`;
}

function createClass(name: string, item: ClassSpec): void {
    writeFileSync(
        path.join(dayPath, `${name}.ts`),
        `export default class ${name}${item.generic || ""} {
    ${(item.properties || []).map(generateProperty).join("\n    ")}

    ${(item.getters || []).map(generateGetter).join("\n    ")}

    constructor() {
    }

    ${(item.methods || []).map(generateMethod).join("\n    ")}
}`,
    );
}

function createFunction(name: string, item: FunctionSpec): void {
    const generic = item.generic ? item.generic : "";
    writeFileSync(
        path.join(dayPath, `${name}.ts`),
        `export default function ${item.fn}${generic}(${item.args}): ${item.return} {

}`,
    );
}

for (const name of names) {
    const item = dsa[name];

    if (item.type === "class") {
        createClass(name, item);
    } else {
        createFunction(name, item);
    }
}

const tsconfigPath = path.join(rootPath, "tsconfig.json");
const tsconfig = JSON.parse(readFileSync(tsconfigPath, "utf8")) as TsConfig;
tsconfig.compilerOptions.paths["@code/*"] = [`${dayName}/*`];

const configuredTests = new Set(names.map((name) => `${name}.ts`));
const excludedTests = readdirSync(path.join(srcPath, "__tests__"))
    .filter((name) => name.endsWith(".ts") && !configuredTests.has(name))
    .map((name) => `src/__tests__/${name}`);
const excludedDays =
    requestedNames.length > 0
        ? readdirSync(srcPath, { withFileTypes: true })
              .filter(
                  (entry) =>
                      entry.isDirectory() &&
                      /^day\d+$/.test(entry.name) &&
                      entry.name !== dayName,
              )
              .map((entry) => `src/${entry.name}`)
        : [];
tsconfig.exclude = ["node_modules", "dist", ...excludedDays, ...excludedTests];

writeFileSync(tsconfigPath, `${JSON.stringify(tsconfig, null, 4)}\n`);

const statsPath = path.join(rootPath, "stats.json");
const stats = existsSync(statsPath)
    ? (JSON.parse(readFileSync(statsPath, "utf8")) as Record<string, number>)
    : {};

for (const name of names) {
    stats[name] = (stats[name] ?? 0) + 1;
}

writeFileSync(statsPath, `${JSON.stringify(stats, null, 4)}\n`);

const packagePath = path.join(rootPath, "package.json");
const packageJson = JSON.parse(
    readFileSync(packagePath, "utf8"),
) as PackageJson;
packageJson.scripts.day = `echo ${relativeDayPath}`;
writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 4)}\n`);

console.log(`generated ${relativeDayPath}`);
