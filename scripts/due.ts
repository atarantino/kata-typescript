import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import config from "../ligma.config";

interface Kata {
    id: string | number;
    kind: string;
    dsa?: string;
}

interface Attempt {
    kid: string | number;
    d: string;
    r: string;
}

interface SyncState {
    katas?: unknown;
    klog?: unknown;
    newPerDay?: unknown;
}

interface ScheduledKata {
    name: string;
    due: boolean;
    dueDate?: string;
    overdueDays: number;
    status: string;
}

const EMPTY_STATE = {
    log: [],
    klog: [],
    katas: [],
    dismissed: [],
    newPerDay: 2,
    prefT: 0,
};
const SYNC_URL = "https://kindred-eel-975.convex.site/sync";
const scriptsPath = path.dirname(fileURLToPath(import.meta.url));
const rootPath = path.join(scriptsPath, "..");

function readEnvFile(): Record<string, string> {
    const envPath = path.join(rootPath, ".env");

    if (!existsSync(envPath)) {
        return {};
    }

    const values: Record<string, string> = {};

    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
        const trimmed = line.trim();

        if (trimmed === "" || trimmed.startsWith("#")) {
            continue;
        }

        const separator = trimmed.indexOf("=");
        if (separator === -1) {
            continue;
        }

        const key = trimmed.slice(0, separator).trim();
        const value = trimmed.slice(separator + 1).trim();
        values[key] = value;
    }

    return values;
}

function formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function parseLocalDate(value: string): Date {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
}

function addLocalDays(value: string, days: number): string {
    const date = parseLocalDate(value);
    date.setDate(date.getDate() + days);
    return formatLocalDate(date);
}

function calendarDayDifference(later: string, earlier: string): number {
    const laterDate = parseLocalDate(later);
    const earlierDate = parseLocalDate(earlier);
    const laterUtc = Date.UTC(
        laterDate.getFullYear(),
        laterDate.getMonth(),
        laterDate.getDate(),
    );
    const earlierUtc = Date.UTC(
        earlierDate.getFullYear(),
        earlierDate.getMonth(),
        earlierDate.getDate(),
    );
    return Math.round((laterUtc - earlierUtc) / 86_400_000);
}

function isId(value: unknown): value is string | number {
    return typeof value === "string" || typeof value === "number";
}

function isKata(value: unknown): value is Kata {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const kata = value as Partial<Kata>;
    return isId(kata.id) && typeof kata.kind === "string";
}

function isAttempt(value: unknown): value is Attempt {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const attempt = value as Partial<Attempt>;
    return (
        isId(attempt.kid) &&
        typeof attempt.d === "string" &&
        typeof attempt.r === "string"
    );
}

/**
 * How many unseen katas may still be introduced today.
 *
 * Without this every unattempted kata reports due at once, which on a fresh
 * seed means all 23 — the cold-start pile that spaced repetition exists to
 * avoid. New forms are introduced a couple per day instead, and only after
 * the day's reviews are already counted.
 */
function newAllowance(
    katas: Kata[],
    attempts: Attempt[],
    today: string,
    newPerDay: number,
): number {
    const introducedToday = katas.filter((kata) => {
        const dates = attempts
            .filter((attempt) => attempt.kid === kata.id)
            .map((attempt) => attempt.d)
            .sort();

        return dates.length > 0 && dates[0] === today;
    }).length;

    return Math.max(0, newPerDay - introducedToday);
}

/**
 * Position in `ligma.config.ts`, so new forms are introduced in a deliberate
 * sequence rather than whatever order the app happened to seed. Reorder that
 * list to change the ramp. Duplicates take their first position; anything
 * missing from it sorts to the end.
 */
function curriculumRank(order: string[]): (name: string) => number {
    const positions = new Map<string, number>();

    order.forEach((name, index) => {
        if (!positions.has(name)) {
            positions.set(name, index);
        }
    });

    return (name) => positions.get(name) ?? Number.MAX_SAFE_INTEGER;
}

export function scheduleKatas(
    katas: Kata[],
    attempts: Attempt[],
    today = formatLocalDate(new Date()),
    newPerDay = 2,
    order: string[] = config.dsa,
): ScheduledKata[] {
    const rankOf = curriculumRank(order);
    const hasAttempt = (kata: Kata) =>
        attempts.some((attempt) => attempt.kid === kata.id);

    const introduced = new Set(
        katas
            .filter((kata) => !hasAttempt(kata))
            .sort(
                (a, b) =>
                    rankOf(a.dsa!) - rankOf(b.dsa!) ||
                    a.dsa!.localeCompare(b.dsa!),
            )
            .slice(0, newAllowance(katas, attempts, today, newPerDay))
            .map((kata) => kata.id),
    );

    return katas
        .map((kata) => {
            const curriculumIndex = rankOf(kata.dsa!);
            const kataAttempts = attempts
                .filter((attempt) => attempt.kid === kata.id)
                .sort((a, b) => a.d.localeCompare(b.d));

            if (kataAttempts.length === 0) {
                const introduce = introduced.has(kata.id);

                return {
                    name: kata.dsa!,
                    due: introduce,
                    overdueDays: 0,
                    status: introduce ? "new" : "queued",
                    curriculumIndex,
                };
            }

            let ease = 2.5;
            let interval = 0;
            let dueDate = "";

            for (const attempt of kataAttempts) {
                if (attempt.r === "instant") {
                    interval =
                        interval === 0
                            ? 7
                            : Math.min(
                                  180,
                                  Math.max(7, Math.round(interval * ease)),
                              );
                    ease = Math.min(3, ease + 0.05);
                } else if (attempt.r === "slow") {
                    interval = Math.max(3, Math.round(interval * 1.2));
                    ease = Math.max(1.3, ease - 0.1);
                } else if (attempt.r === "blank") {
                    interval = 2;
                    ease = Math.max(1.3, ease - 0.25);
                }

                dueDate = addLocalDays(attempt.d, interval);
            }

            const overdueDays = calendarDayDifference(today, dueDate);
            const due = dueDate <= today;
            const status =
                overdueDays > 0
                    ? `${overdueDays}d overdue`
                    : overdueDays === 0
                      ? "due today"
                      : `due ${dueDate}`;

            return {
                name: kata.dsa!,
                due,
                dueDate,
                overdueDays,
                status,
                curriculumIndex,
            };
        })
        .sort(
            (a, b) =>
                rank(a) - rank(b) ||
                b.overdueDays - a.overdueDays ||
                (a.dueDate ?? today).localeCompare(b.dueDate ?? today) ||
                a.curriculumIndex - b.curriculumIndex ||
                a.name.localeCompare(b.name),
        )
        .map(({ curriculumIndex: _curriculumIndex, ...item }) => item);
}

/**
 * Work to do first, then what's scheduled, then the not-yet-introduced tail.
 */
function rank(item: { due: boolean; status: string }): number {
    if (item.due) {
        return 0;
    }

    return item.status === "queued" ? 2 : 1;
}

function printTable(schedule: ScheduledKata[]): void {
    const nameWidth = Math.max(
        "DSA".length,
        ...schedule.map((item) => item.name.length),
    );
    console.log(`${"DSA".padEnd(nameWidth)}  Status`);
    console.log(`${"-".repeat(nameWidth)}  ${"-".repeat(14)}`);

    for (const item of schedule) {
        console.log(`${item.name.padEnd(nameWidth)}  ${item.status}`);
    }
}

/**
 * Show today's work, then summarize the rest. `--all` prints everything.
 */
function printSchedule(
    schedule: ScheduledKata[],
    showAll: boolean,
    newPerDay: number,
): void {
    const due = schedule.filter((item) => item.due);

    if (showAll) {
        printTable(schedule);
        console.log(`\n${due.length} of ${schedule.length} due`);
        return;
    }

    if (due.length === 0) {
        console.log("Nothing is due today.");
    } else {
        printTable(due);
    }

    const scheduled = schedule.filter(
        (item) => !item.due && item.status !== "queued",
    );
    const queued = schedule.filter((item) => item.status === "queued");
    const rest: string[] = [];

    if (scheduled.length > 0) {
        rest.push(`${scheduled.length} scheduled`);
    }

    if (queued.length > 0) {
        rest.push(`${queued.length} not started (${newPerDay} new per day)`);
    }

    if (rest.length > 0) {
        console.log(`\n${rest.join(", ")} — run with --all to see them`);
    }
}

/**
 * `--new <n>` for a one-off change of pace, otherwise whatever the app is set
 * to, otherwise the app's own default.
 */
function readNewPerDay(args: string[], synced: unknown): number {
    const flag = args.indexOf("--new");

    if (flag !== -1) {
        const override = Number(args[flag + 1]);

        if (Number.isInteger(override) && override >= 0) {
            return override;
        }

        console.error("--new needs a whole number, e.g. --new 5");
        process.exitCode = 1;
    }

    return typeof synced === "number" && Number.isInteger(synced) && synced >= 0
        ? synced
        : EMPTY_STATE.newPerDay;
}

async function loadState(key: string): Promise<SyncState> {
    let response: Response;

    try {
        response = await fetch(SYNC_URL, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ key, state: EMPTY_STATE }),
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Could not reach the sync endpoint: ${message}`);
    }

    if (response.status !== 200) {
        throw new Error(
            `Sync endpoint returned ${response.status} ${response.statusText}`.trim(),
        );
    }

    let body: unknown;
    try {
        body = await response.json();
    } catch {
        throw new Error("Sync endpoint returned invalid JSON");
    }

    if (typeof body !== "object" || body === null || !("state" in body)) {
        throw new Error("Sync endpoint response did not contain state");
    }

    const state = (body as { state?: unknown }).state;
    if (typeof state !== "object" || state === null) {
        throw new Error("Sync endpoint response contained invalid state");
    }

    return state as SyncState;
}

async function main(): Promise<void> {
    const key = process.env.KATA_SYNC_KEY || readEnvFile().KATA_SYNC_KEY;

    if (!key) {
        console.error("No KATA_SYNC_KEY was found.");
        console.error("Enable Sync in the web app and open its pairing link.");
        console.error("The link ends in #k=<key>.");
        console.error("Add KATA_SYNC_KEY=<key> to .env in this repository.");
        process.exitCode = 1;
        return;
    }

    let state: SyncState;
    try {
        state = await loadState(key);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Unable to load the kata schedule: ${message}`);
        process.exitCode = 1;
        return;
    }

    const katas = Array.isArray(state.katas)
        ? state.katas
              .filter(isKata)
              .filter(
                  (kata): kata is Kata & { dsa: string } =>
                      kata.kind === "repo" &&
                      typeof kata.dsa === "string" &&
                      kata.dsa.trim() !== "",
              )
        : [];

    if (katas.length === 0) {
        console.log(
            "No repo DSA katas are synced yet. Seed the DSA set from the web app's Katas tab.",
        );
        return;
    }

    const attempts = Array.isArray(state.klog)
        ? state.klog.filter(isAttempt)
        : [];
    const args = process.argv.slice(2);
    const newPerDay = readNewPerDay(args, state.newPerDay);
    const schedule = scheduleKatas(
        katas,
        attempts,
        formatLocalDate(new Date()),
        newPerDay,
    );
    const dueNames = schedule
        .filter((item) => item.due)
        .map((item) => item.name);

    printSchedule(schedule, args.includes("--all"), newPerDay);

    if (!args.includes("--generate")) {
        return;
    }

    if (dueNames.length === 0) {
        console.log("Nothing is due; no day was generated.");
        return;
    }

    const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
    const result = spawnSync(
        npmCommand,
        ["run", "generate", "--", ...dueNames],
        {
            cwd: rootPath,
            stdio: "inherit",
        },
    );

    if (result.error) {
        console.error(`Could not run the generator: ${result.error.message}`);
        process.exitCode = 1;
    } else if (result.status !== 0) {
        process.exitCode = result.status ?? 1;
    }
}

if (
    process.argv[1] &&
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
    await main();
}
