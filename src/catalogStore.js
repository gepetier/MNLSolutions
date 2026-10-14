import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const APP_ROOT = process.env.HUURRE_APP_ROOT || resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FALLBACK_CATALOG_PATH = resolve(APP_ROOT, "data/catalog.json");
const USER_DATA_DIR = process.env.HUURRE_DATA_DIR;
const DEFAULT_CATALOG_PATH = USER_DATA_DIR ? resolve(USER_DATA_DIR, "catalog.json") : FALLBACK_CATALOG_PATH;
const LEGACY_CATALOG_PATH = process.env.HUURRE_LEGACY_DATA_DIR
  ? resolve(process.env.HUURRE_LEGACY_DATA_DIR, "catalog.json")
  : null;

export function readCatalog(path = DEFAULT_CATALOG_PATH) {
  ensureWritableCatalog(path);
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

export function writeCatalog(catalog, path = DEFAULT_CATALOG_PATH) {
  ensureWritableCatalog(path);
  writeFileSync(resolve(path), `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
}

function ensureWritableCatalog(path) {
  const catalogPath = resolve(path);
  if (existsSync(catalogPath)) {
    return;
  }

  mkdirSync(dirname(catalogPath), { recursive: true });
  copyFileSync(LEGACY_CATALOG_PATH && existsSync(LEGACY_CATALOG_PATH) ? LEGACY_CATALOG_PATH : FALLBACK_CATALOG_PATH, catalogPath);
}
