import { spawnSync } from "node:child_process";
import {
    existsSync,
    mkdirSync,
    readFileSync,
    readdirSync,
    rmSync,
    writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { isUntouchedStub } from "./stub";

interface VitestReport {
    testResults?: {
        name: string;
        status: string;
    }[];
}

type Status = "passing" | "failing" | "unverified";

const scriptsPath = path.dirname(fileURLToPath(import.meta.url));
const rootPath = path.join(scriptsPath, "..");
const srcPath = path.join(rootPath, "src");
const currentPath = path.join(srcPath, "current");
const attemptsPath = path.join(rootPath, "attempts");

/**
 * Run the suite once and map each kata to whether its test file passed.
 *
 * The current practice directory is wired to `@code/*`, so each result maps
 * directly to the implementation being archived.
 */
function testResults(): Map<string, Status> {
    const results = new Map<string, Status>();
    const reportPath = path.join(
        os.tmpdir(),
        `kata-archive-${process.pid}.json`,
    );

    spawnSync(
        "npx",
        ["vitest", "run", "--reporter=json", `--outputFile=${reportPath}`],
        {
            cwd: rootPath,
            stdio: "ignore",
        },
    );

    if (!existsSync(reportPath)) {
        console.warn("could not run vitest; archiving as unverified");
        return results;
    }

    const report = JSON.parse(readFileSync(reportPath, "utf8")) as VitestReport;
    rmSync(reportPath, { force: true });

    for (const result of report.testResults ?? []) {
        const kata = path.basename(result.name, ".ts");
        results.set(kata, result.status === "passed" ? "passing" : "failing");
    }

    return results;
}

/**
 * Copy one attempt into `attempts/<Kata>/<date>-<status>.ts`, skipping work
 * already archived today. Returns the path written, or null when skipped.
 */
function archiveAttempt(
    kata: string,
    contents: string,
    status: Status,
): string | null {
    const kataPath = path.join(attemptsPath, kata);
    const date = new Date().toISOString().slice(0, 10);

    mkdirSync(kataPath, { recursive: true });

    const sameDay = readdirSync(kataPath).filter((name) =>
        name.startsWith(date),
    );

    if (
        sameDay.some(
            (name) =>
                readFileSync(path.join(kataPath, name), "utf8") === contents,
        )
    ) {
        return null;
    }

    let attemptPath = path.join(kataPath, `${date}-${status}.ts`);

    for (let suffix = 2; existsSync(attemptPath); suffix += 1) {
        attemptPath = path.join(kataPath, `${date}-${status}-${suffix}.ts`);
    }

    writeFileSync(attemptPath, contents);

    return attemptPath;
}

/**
 * Archive every non-stub implementation in the current practice directory.
 */
export function archiveCurrent(): void {
    if (!existsSync(currentPath)) {
        return;
    }

    const results = testResults();
    let archived = 0;

    for (const file of readdirSync(currentPath)) {
        if (!file.endsWith(".ts")) {
            continue;
        }

        const kata = path.basename(file, ".ts");
        const contents = readFileSync(path.join(currentPath, file), "utf8");

        if (isUntouchedStub(kata, contents)) {
            continue;
        }

        const status = results.get(kata) ?? "unverified";
        const attemptPath = archiveAttempt(kata, contents, status);

        if (attemptPath !== null) {
            console.log("archived", path.relative(rootPath, attemptPath));
            archived += 1;
        }
    }

    if (archived === 0) {
        console.log("nothing to archive");
    }
}

if (
    process.argv[1] !== undefined &&
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
    archiveCurrent();
}
