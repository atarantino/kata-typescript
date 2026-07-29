import { readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsPath = path.dirname(fileURLToPath(import.meta.url));
const srcPath = path.join(scriptsPath, "..", "src");

for (const entry of readdirSync(srcPath, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith("day")) {
        continue;
    }

    const dayPath = path.join(srcPath, entry.name);
    console.log("deleting", dayPath);
    rmSync(dayPath, { recursive: true, force: true });
}
