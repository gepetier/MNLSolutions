import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const result = spawnSync(process.env.PYTHON || "python", [
  fileURLToPath(new URL("./inspect_workbook.py", import.meta.url)),
  ...process.argv.slice(2),
], { stdio: "inherit" });
if (result.error) throw result.error;
process.exit(result.status || 0);
