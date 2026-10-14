import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import "../../../src/config.js";

export function privatePath(name) {
  if (!process.env.MNL_SENSITIVE_DATA_DIR) {
    throw new Error("Configura MNL_SENSITIVE_DATA_DIR amb una carpeta privada externa.");
  }
  const path = resolve(process.env.MNL_SENSITIVE_DATA_DIR, name);
  mkdirSync(dirname(path), { recursive: true });
  return path;
}
