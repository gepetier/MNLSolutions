import { privatePath } from "./private-path.js";
import { OdooClient } from "../../../src/odooClient.js";
import { requireConfig } from "../../../src/config.js";
import { writeFileSync } from "node:fs";

const client = new OdooClient(requireConfig());
await client.authenticate();
const rows = await client.searchRead("product.category", [], ["id", "name", "parent_id", "complete_name"], { limit: 1000, order: "name" });
const products = await client.searchRead("product.template", [], ["id", "categ_id"], { limit: 10000 });
const usage = new Map();
for (const product of products) usage.set(product.categ_id?.[0], (usage.get(product.categ_id?.[0]) || 0) + 1);
const snapshot = { database: client.database, categories: rows.map((row) => ({ id: row.id, name: row.name, completeName: row.complete_name, parentId: row.parent_id?.[0] || null, parent: row.parent_id?.[1] || null, productTemplates: usage.get(row.id) || 0 })) };
const output = privatePath(`category-tree-${client.database}.json`);
writeFileSync(output, JSON.stringify(snapshot, null, 2));
console.log(JSON.stringify({ database: client.database, count: rows.length, productTemplates: products.length, output, categories: snapshot.categories.filter((item) => item.completeName?.startsWith("Panells") || !item.parentId).map(({ id, name, completeName, parent, productTemplates }) => ({ id, name, completeName, parent, productTemplates })) }, null, 2));
