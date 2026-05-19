import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

function loadDotEnv(path = ".env") {
  const absolutePath = resolve(path);
  if (!existsSync(absolutePath)) {
    return;
  }

  const content = readFileSync(absolutePath, "utf8").trim();
  if (content && !content.includes("=")) {
    process.env.HOLDED_API_KEY = process.env.HOLDED_API_KEY || content;
    return;
  }

  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadDotEnv();
loadDotEnv("pass.env");
if (process.env.HOLDED_CONFIG_DIR) {
  loadDotEnv(join(process.env.HOLDED_CONFIG_DIR, ".env"));
  loadDotEnv(join(process.env.HOLDED_CONFIG_DIR, "pass.env"));
}
if (process.env.HOLDED_LEGACY_CONFIG_DIR) {
  loadDotEnv(join(process.env.HOLDED_LEGACY_CONFIG_DIR, ".env"));
  loadDotEnv(join(process.env.HOLDED_LEGACY_CONFIG_DIR, "pass.env"));
}

export const config = {
  apiKey: process.env.HOLDED_API_KEY,
  baseUrl: process.env.HOLDED_BASE_URL || "https://api.holded.com/api",
};

export function requireConfig() {
  if (!config.apiKey || config.apiKey === "posa_la_teva_api_key_aqui") {
    throw new Error(
      "Falta HOLDED_API_KEY. Copia .env.example a .env i posa-hi la teva API Key de Holded.",
    );
  }

  return config;
}
