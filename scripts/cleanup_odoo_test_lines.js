import { requireConfig } from "../src/config.js";
import { OdooClient } from "../src/odooClient.js";

const client = new OdooClient(requireConfig());
const orderId = Number(process.argv[2]);
const ids = process.argv.slice(3).map(Number).filter(Number.isFinite);
if (!orderId || !ids.length) throw new Error("Indica l'ID de la comanda i com a minim un ID de linia.");

await client.authenticate();
const rows = await client.searchRead(
  "sale.order.line",
  [["id", "in", ids]],
  ["id", "order_id", "product_id", "create_date"],
  { limit: ids.length },
);
if (rows.length !== ids.length || rows.some((row) => row.order_id?.[0] !== orderId)) {
  throw new Error(`La verificacio dels objectius de neteja no coincideix amb la comanda ${orderId}.`);
}
await client.call("sale.order.line", "unlink", [ids]);
console.log(JSON.stringify({ database: client.database, removed: rows }, null, 2));
