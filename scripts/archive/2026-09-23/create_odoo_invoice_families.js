import { privatePath } from "./private-path.js";
import { readFileSync, appendFileSync } from "node:fs";
import { OdooClient } from "../../../src/odooClient.js";
import { requireConfig } from "../../../src/config.js";

const expectedDatabase = process.argv[2];
const mode = process.argv[3];
if (!expectedDatabase || !["--preview", "--apply"].includes(mode)) {
  throw new Error("Cal indicar la base esperada i --preview o --apply.");
}
const families = [
  { family: "Panells de coberta", name: "Coberta", parent: "Panells" },
  { family: "Panells de façana", name: "Facana", parent: "Panells" },
  { family: "Altres panells", name: "Altres", parent: "Panells" },
  { family: "Remats i xapes", name: "Remats i xapes" },
  { family: "Transport i ports", name: "Transport i ports" },
  { family: "Perfils i subestructures", name: "Perfils i subestructures" },
  { family: "Enginyeria i serveis", name: "Enginyeria i serveis" },
  { family: "Ajustos i bestretes", name: "Ajustos i bestretes" },
  { family: "Juntes i segellat", name: "Juntes i segellat" },
  { family: "Llucernaris", name: "Llucernaris" },
  { family: "Cargoleria i accessoris", name: "Cargoleria i accessoris" },
  { family: "Canalons i drenatge", name: "Canalons i drenatge" },
  { family: "Acabats i colors", name: "Acabats i colors" },
];
const inventory = JSON.parse(readFileSync(privatePath("invoice_concepts.json"), "utf8"));
const foundFamilies = new Set(inventory.concepts.map((item) => item.family).filter((name) => name !== "Per revisar"));
if (foundFamilies.size !== families.length || families.some((item) => !foundFamilies.has(item.family))) {
  throw new Error("Les famílies ja no coincideixen amb l'inventari revisat.");
}
const client = new OdooClient(requireConfig());
if (client.database !== expectedDatabase) {
  throw new Error(`Base inesperada: ${client.database}`);
}
await client.authenticate();
let categories = await client.searchRead("product.category", [], ["id", "name", "parent_id", "complete_name"], { limit: 1000 });
const root = categories.filter((item) => item.name === "Panells" && !item.parent_id);
if (root.length !== 1) {
  throw new Error(`Categoria pare Panells inesperada: ${root.length}.`);
}
const parentId = root[0].id;
function matches(plan) {
  return categories.filter((item) => item.name === plan.name && (item.parent_id?.[0] || false) === (plan.parent ? parentId : false));
}
const preview = families.map((plan) => {
  const rows = matches(plan);
  if (rows.length > 1) throw new Error(`Categoria duplicada: ${plan.name}`);
  return { family: plan.family, category: plan.parent ? `Panells / ${plan.name}` : plan.name, action: rows.length ? "reuse" : "create" };
});
console.log(JSON.stringify({ database: client.database, mode, categoryCountBefore: categories.length, plan: preview }, null, 2));
if (mode === "--apply") {
const logPath = privatePath(`families-upload-${client.database}-${Date.now()}.jsonl`);
appendFileSync(logPath, JSON.stringify({ phase: "start", database: client.database, plan: preview }) + "\n");
for (const plan of families) {
  const rows = matches(plan);
  if (rows.length === 1) continue;
  const id = await client.create("product.category", { name: plan.name, parent_id: plan.parent ? parentId : false });
  const record = { id, name: plan.name, parent_id: plan.parent ? [parentId, "Panells"] : false };
  categories.push(record);
  appendFileSync(logPath, JSON.stringify({ phase: "created", id, family: plan.family, name: plan.name, parent: plan.parent || null }) + "\n");
  console.log(JSON.stringify({ phase: "created", family: plan.family, id }));
}
categories = await client.searchRead("product.category", [], ["id", "name", "parent_id", "complete_name"], { limit: 1000 });
const after = families.map((plan) => ({ family: plan.family, matches: matches(plan).length, category: matches(plan)[0]?.complete_name || null }));
const ok = after.every((item) => item.matches === 1);
appendFileSync(logPath, JSON.stringify({ phase: "after", ok, after }) + "\n");
console.log(JSON.stringify({ phase: "after", database: client.database, ok, categoryCountAfter: categories.length, mappedFamilies: after.length, logPath }));
if (!ok) process.exitCode = 1;
}
