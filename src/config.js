import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

function loadDotEnv(path = ".env") {
  const absolutePath = resolve(path);
  if (!existsSync(absolutePath)) {
    return;
  }

  const content = readFileSync(absolutePath, "utf8").trim();
  if (content && !content.includes("=")) {
    process.env.ODOO_API_KEY = process.env.ODOO_API_KEY || content;
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
if (process.env.ODOO_CONFIG_DIR) {
  loadDotEnv(join(process.env.ODOO_CONFIG_DIR, ".env"));
  loadDotEnv(join(process.env.ODOO_CONFIG_DIR, "pass.env"));
}
if (process.env.ODOO_LEGACY_CONFIG_DIR) {
  loadDotEnv(join(process.env.ODOO_LEGACY_CONFIG_DIR, ".env"));
  loadDotEnv(join(process.env.ODOO_LEGACY_CONFIG_DIR, "pass.env"));
}

export const config = {
  url: process.env.ODOO_URL,
  database: process.env.ODOO_DB,
  username: process.env.ODOO_USERNAME,
  apiKey: process.env.ODOO_API_KEY || process.env.ODOO_PASSWORD,
  m2UomName: process.env.ODOO_M2_UOM || "m2",
  customerTaxId: process.env.ODOO_CUSTOMER_TAX_ID ? Number(process.env.ODOO_CUSTOMER_TAX_ID) : null,
};

export function requireConfig() {
  const missing = [];
  if (!config.url) missing.push("ODOO_URL");
  if (!config.database) missing.push("ODOO_DB");
  if (!config.username) missing.push("ODOO_USERNAME");
  if (!config.apiKey || config.apiKey === "posa_la_teva_api_key_aqui") missing.push("ODOO_API_KEY");

  if (missing.length) {
    throw new Error(
      `Falta configuracio Odoo: ${missing.join(", ")}. Copia .env.example a .env i posa-hi les credencials d'Odoo.`,
    );
  }

  return config;
}
