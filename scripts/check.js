import { readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function check(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory() && entry.name !== "__pycache__") check(path);
    else if (entry.isFile() && /\.(js|cjs|mjs)$/.test(entry.name)) {
      const result = spawnSync(process.execPath, ["--check", path], { stdio: "inherit" });
      if (result.error) throw result.error;
      if (result.status !== 0) process.exit(result.status || 1);
    }
  }
}
for (const directory of ["src", "scripts", "electron", "public"]) check(directory);
console.log("Sintaxi JavaScript correcta.");
