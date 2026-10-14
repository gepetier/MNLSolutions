import { requireConfig } from "../src/config.js";
import { OdooClient } from "../src/odooClient.js";

const client = new OdooClient(requireConfig());
await client.authenticate();
const fields = await client.call("ir.asset", "fields_get", [], { attributes: ["type", "string", "required"] });
const rows = await client.searchRead(
  "ir.asset",
  ["|", ["name", "ilike", "MNL"], ["path", "ilike", "/web/content"]],
  Object.keys(fields).filter((name) => ["id", "name", "bundle", "directive", "path", "active", "sequence", "target"].includes(name)),
  { limit: 50, order: "id desc" },
);
console.log(JSON.stringify({ fields, rows }, null, 2));
