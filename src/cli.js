#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { readCatalog } from "./catalogStore.js";
import { requireConfig } from "./config.js";
import { OdooApiError, OdooClient } from "./odooClient.js";
import { buildOdooSyncPreview, createTestSaleOrder, rollbackOdooProducts, syncOdooProducts } from "./odooSync.js";

async function main() {
  const [command, ...args] = process.argv.slice(2);
  const client = new OdooClient(requireConfig());
  const catalog = readCatalog();

  switch (command) {
    case "ping":
      await client.authenticate();
      return print({ ok: true, uid: client.uid });
    case "products:preview":
      return print(await buildOdooSyncPreview(client, catalog));
    case "products:sync":
      return print(writeSyncLog(await syncOdooProducts(client, catalog, { dryRun: false })));
    case "products:dry-run":
      return print(await syncOdooProducts(client, catalog, { dryRun: true }));
    case "products:rollback":
      return print(await rollbackOdooProducts(client, readJsonArg(args[0]), { dryRun: false }));
    case "products:rollback:dry-run":
      return print(await rollbackOdooProducts(client, readJsonArg(args[0]), { dryRun: true }));
    case "quote:create":
      return print(await createTestSaleOrder(client, catalog, readJsonArg(args[0])));
    default:
      usage();
      process.exitCode = command ? 1 : 0;
  }
}

function readJsonArg(filePath) {
  if (!filePath) {
    throw new Error("Falta el fitxer JSON.");
  }
  return JSON.parse(readFileSync(resolve(filePath), "utf8"));
}

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

function writeSyncLog(result) {
  mkdirSync("logs", { recursive: true });
  const path = resolve("logs", `odoo-sync-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  const payload = {
    generatedAt: new Date().toISOString(),
    rollbackType: "archive-product-templates",
    ...result,
  };
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return { ...payload, rollbackFile: path };
}

function usage() {
  console.log(`
Comandes Odoo:
  node src/cli.js ping
  node src/cli.js products:preview
  node src/cli.js products:dry-run
  node src/cli.js products:sync
  node src/cli.js products:rollback:dry-run logs/odoo-sync-....json
  node src/cli.js products:rollback logs/odoo-sync-....json
  node src/cli.js quote:create examples/odoo-quote.sample.json
`);
}

main().catch((error) => {
  if (error instanceof OdooApiError) {
    console.error(error.message);
    console.error(JSON.stringify(error.body, null, 2));
  } else {
    console.error(error.message);
  }
  process.exitCode = 1;
});
