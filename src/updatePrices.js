#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { requireConfig } from "./config.js";
import { parseCsv } from "./csv.js";
import { HoldedClient } from "./holdedClient.js";

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const csvPath = args.find((arg) => arg !== "--dry-run");

  if (!csvPath) {
    throw new Error("Falta el CSV de preus. Exemple: node src/updatePrices.js --dry-run data/prices.example.csv");
  }

  const client = new HoldedClient(requireConfig());
  const desiredPrices = parsePriceRows(readFileSync(resolve(csvPath), "utf8"));
  const products = await client.listProducts();
  const productsBySku = new Map(products.filter((product) => product.sku).map((product) => [product.sku, product]));
  const report = [];

  for (const desired of desiredPrices) {
    const product = productsBySku.get(desired.sku);
    if (!product) {
      report.push({ sku: desired.sku, status: "not-found" });
      continue;
    }

    const patch = {
      cost: desired.cost,
      purchasePrice: desired.cost,
      price: desired.price,
    };

    if (!dryRun) {
      await client.updateProduct(product.id, patch);
    }

    report.push({
      sku: desired.sku,
      id: product.id,
      status: dryRun ? "preview" : "updated",
      from: {
        cost: product.cost,
        purchasePrice: product.purchasePrice,
        price: product.price,
      },
      to: patch,
    });
  }

  console.log(JSON.stringify(report, null, 2));
}

function parsePriceRows(text) {
  return parseCsv(text).map((row) => ({
    sku: requireValue(row.sku, "sku"),
    cost: parseMoney(row.cost, row.sku, "cost"),
    price: parseMoney(row.price, row.sku, "price"),
  }));
}

function parseMoney(value, sku, field) {
  const normalized = requireValue(value, field).replace(",", ".");
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) {
    throw new Error(`Preu invalid a ${sku}, camp ${field}: ${value}`);
  }
  return amount;
}

function requireValue(value, field) {
  if (value === undefined || value === null || value === "") {
    throw new Error(`Falta el camp ${field}.`);
  }
  return value;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
