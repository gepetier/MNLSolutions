import { privatePath } from "./private-path.js";
import { readFileSync, appendFileSync } from "node:fs";
import { OdooClient } from "../../../src/odooClient.js";
import { requireConfig } from "../../../src/config.js";

const expectedDatabase = process.argv[2];
const mode = process.argv[3];
if (!expectedDatabase || !["--preview", "--apply"].includes(mode)) {
  throw new Error("Cal indicar la base esperada i --preview o --apply.");
}
const inventory = JSON.parse(readFileSync(privatePath("invoice_concepts.json"), "utf8"));
const familyCategory = new Map([
  ["Panells de coberta", "Panells / Coberta"],
  ["Panells de façana", "Panells / Facana"],
  ["Altres panells", "Panells / Altres"],
]);
const grouped = new Map();
for (const concept of inventory.concepts) {
  if (concept.family === "Per revisar") continue;
  const key = `${concept.family}\u0000${concept.group}`;
  grouped.set(key, { family: concept.family, group: concept.group });
}
const plan = [...grouped.values()];
if (plan.length !== 45) throw new Error(`Nombre inesperat de subfamílies: ${plan.length}.`);
const client = new OdooClient(requireConfig());
if (client.database !== expectedDatabase) throw new Error(`Base inesperada: ${client.database}`);
await client.authenticate();
let categories = await client.searchRead("product.category", [], ["id", "name", "parent_id", "complete_name"], { limit: 1000 });
const familyCompleteName = (family) => familyCategory.get(family) || family;
const matches = (entry, parentId) => categories.filter(
  (item) => item.name === entry.group && (item.parent_id?.[0] || false) === parentId,
);
const resolvedPlan = plan.map((entry) => {
  const expectedParentName = familyCompleteName(entry.family);
  const parents = categories.filter((item) => item.complete_name === expectedParentName);
  if (parents.length !== 1) throw new Error(`No s'ha trobat una categoria familiar única: ${expectedParentName} (${parents.length}).`);
  const existing = matches(entry, parents[0].id);
  if (existing.length > 1) throw new Error(`Subfamília duplicada: ${expectedParentName} / ${entry.group}`);
  return { ...entry, parentId: parents[0].id, completeName: `${expectedParentName} / ${entry.group}`, action: existing.length ? "reuse" : "create" };
}).sort((a, b) => a.family.localeCompare(b.family, "ca") || a.group.localeCompare(b.group, "ca"));
console.log(JSON.stringify({ database: client.database, mode, subfamilyCount: resolvedPlan.length, createCount: resolvedPlan.filter((x) => x.action === "create").length, reuseCount: resolvedPlan.filter((x) => x.action === "reuse").length, plan: resolvedPlan.map(({ family, group, completeName, action }) => ({ family, group, completeName, action })) }, null, 2));

if (mode === "--apply") {
  const logPath = privatePath(`subfamilies-upload-${client.database}-${Date.now()}.jsonl`);
  appendFileSync(logPath, JSON.stringify({ phase: "start", database: client.database, plan: resolvedPlan.map(({ family, group, completeName, action }) => ({ family, group, completeName, action })) }) + "\n");
  for (const entry of resolvedPlan) {
    if (entry.action === "reuse") continue;
    const id = await client.create("product.category", { name: entry.group, parent_id: entry.parentId });
    categories.push({ id, name: entry.group, parent_id: [entry.parentId, entry.family], complete_name: entry.completeName });
    appendFileSync(logPath, JSON.stringify({ phase: "created", id, family: entry.family, group: entry.group, completeName: entry.completeName }) + "\n");
    console.log(JSON.stringify({ phase: "created", family: entry.family, group: entry.group, id }));
  }
  categories = await client.searchRead("product.category", [], ["id", "name", "parent_id", "complete_name"], { limit: 1000 });
  const after = resolvedPlan.map((entry) => ({ completeName: entry.completeName, count: matches(entry, entry.parentId).length }));
  const ok = after.every((item) => item.count === 1);
  appendFileSync(logPath, JSON.stringify({ phase: "after", ok, subfamilyCount: after.length, after }) + "\n");
  console.log(JSON.stringify({ phase: "after", database: client.database, ok, subfamilyCount: after.length, categoryCountAfter: categories.length, logPath }));
  if (!ok) process.exitCode = 1;
}
