import { requireConfig } from "../src/config.js";
import { OdooClient } from "../src/odooClient.js";

const client = new OdooClient(requireConfig());
const orderId = Number(process.argv[2]);
if (!orderId) throw new Error("Indica l'ID de la comanda.");

await client.authenticate();
const rows = await client.searchRead(
  "sale.order.line",
  [["order_id", "=", orderId]],
  [
    "id",
    "sequence",
    "display_type",
    "name",
    "product_id",
    "product_uom_qty",
    "x_studio_uds",
    "x_studio_long",
    "x_studio_ancho_1",
    "create_date",
    "write_date",
  ],
  { order: "sequence,id", limit: 200 },
);
console.log(JSON.stringify(rows, null, 2));
