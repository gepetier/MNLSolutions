import { privatePath } from "./private-path.js";
import { readFileSync, appendFileSync } from "node:fs";
import { OdooClient } from "../../../src/odooClient.js";
import { requireConfig } from "../../../src/config.js";

const expectedDatabase = process.argv[2];
const mode = process.argv[3];
if (!expectedDatabase || !["--preview", "--apply"].includes(mode)) throw new Error("Cal indicar la base esperada i --preview o --apply.");
const testSnapshot = JSON.parse(readFileSync(privatePath("category-tree-provesmnl202609.json"), "utf8"));
if (testSnapshot.database !== "provesmnl202609") throw new Error("La font no és la base de proves esperada.");
const expected = new Set(testSnapshot.categories.map((item) => item.completeName));
const client = new OdooClient(requireConfig());
if (client.database !== expectedDatabase) throw new Error(`Base inesperada: ${client.database}`);
await client.authenticate();

async function snapshot() {
  const categories = await client.searchRead("product.category", [], ["id", "name", "parent_id", "complete_name"], { limit: 1000 });
  const products = await client.searchRead("product.template", [], ["id", "categ_id"], { limit: 10000 });
  const used = new Map();
  for (const product of products) used.set(product.categ_id?.[0], (used.get(product.categ_id?.[0]) || 0) + 1);
  return categories.map((item) => ({ id: item.id, name: item.name, parentId: item.parent_id?.[0] || null, completeName: item.complete_name, productTemplates: used.get(item.id) || 0 }));
}

let categories = await snapshot();
const current = new Set(categories.map((item) => item.completeName));
const missing = [...expected].filter((name) => !current.has(name));
const stale = categories.filter((item) => !expected.has(item.completeName));
if (missing.length) throw new Error(`Categories de proves que falten a principal: ${missing.join("; ")}`);
const hasChildren = (item) => categories.some((child) => child.parentId === item.id);
const unsafe = stale.filter((item) => item.productTemplates > 0 || hasChildren(item));
if (unsafe.length) throw new Error(`Hi ha categories sobrants amb productes o subcategories: ${JSON.stringify(unsafe.map(({ completeName, productTemplates }) => ({ completeName, productTemplates })))}`);
console.log(JSON.stringify({ database: client.database, mode, sourceCount: expected.size, currentCount: categories.length, staleCount: stale.length, missingCount: missing.length, safeToRemove: stale.every((item) => item.productTemplates === 0 && !hasChildren(item)), stale: stale.map(({ id, completeName, productTemplates }) => ({ id, completeName, productTemplates })) }, null, 2));

if (mode === "--apply") {
  const logPath = privatePath(`category-align-${client.database}-${Date.now()}.jsonl`);
  appendFileSync(logPath, JSON.stringify({ phase: "start", database: client.database, sourceCount: expected.size, stale: stale.map(({ id, completeName }) => ({ id, completeName })) }) + "\n");
  for (const item of stale) {
    await client.unlink("product.category", [item.id]);
    appendFileSync(logPath, JSON.stringify({ phase: "deleted", id: item.id, completeName: item.completeName }) + "\n");
    console.log(JSON.stringify({ phase: "deleted", id: item.id, completeName: item.completeName }));
  }
  categories = await snapshot();
  const after = new Set(categories.map((item) => item.completeName));
  const afterMissing = [...expected].filter((name) => !after.has(name));
  const afterExtra = [...after].filter((name) => !expected.has(name));
  const ok = afterMissing.length === 0 && afterExtra.length === 0;
  appendFileSync(logPath, JSON.stringify({ phase: "after", ok, count: categories.length, afterMissing, afterExtra }) + "\n");
  console.log(JSON.stringify({ phase: "after", database: client.database, ok, categoryCount: categories.length, sourceCount: expected.size, missing: afterMissing, extra: afterExtra, logPath }));
  if (!ok) process.exitCode = 1;
}
