import { requireConfig } from "../src/config.js";
import { OdooClient } from "../src/odooClient.js";

const client = new OdooClient(requireConfig());
const ids = process.argv.slice(2).map(Number).filter(Number.isFinite);
if (!ids.length) throw new Error("Indica les automatitzacions a desactivar.");
await client.authenticate();
const rows = await client.searchRead("base.automation", [["id", "in", ids]], ["id", "name", "active"], { limit: ids.length });
if (rows.length !== ids.length || rows.some((row) => !row.name.startsWith("MNL - "))) {
  throw new Error("La verificacio de les automatitzacions no coincideix.");
}
await client.write("base.automation", ids, { active: false });
console.log(JSON.stringify({ database: client.database, disabled: rows }, null, 2));
