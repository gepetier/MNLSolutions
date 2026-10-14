import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const SENSITIVE_DATA_DIR = process.env.MNL_SENSITIVE_DATA_DIR || "Z:/Adri/Dades MNLSolutions";
const QUOTE_PRODUCTS_PATH = resolve(SENSITIVE_DATA_DIR, "quote-products.json");

export function readQuoteProductsPayload(path = QUOTE_PRODUCTS_PATH) {
  if (!existsSync(path)) {
    return {
      generatedAt: null,
      sourceRoot: null,
      scannedFiles: 0,
      rawLineCount: 0,
      productCount: 0,
      errorCount: 0,
      products: [],
      errors: [],
    };
  }
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

export function writeQuoteProductsPayload(payload, path = QUOTE_PRODUCTS_PATH) {
  const next = {
    ...payload,
    productCount: (payload.products || []).length,
  };
  writeFileSync(resolve(path), `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}
