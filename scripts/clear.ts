import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { archiveCurrent } from "./archive";

const scriptsPath = path.dirname(fileURLToPath(import.meta.url));
const srcPath = path.join(scriptsPath, "..", "src");
const currentPath = path.join(srcPath, "current");

if (!process.argv.includes("--no-archive")) {
    archiveCurrent();
}

if (existsSync(currentPath)) {
    console.log("deleting", currentPath);
    rmSync(currentPath, { recursive: true, force: true });
}
