import { requireConfig } from "../src/config.js";
import { OdooClient } from "../src/odooClient.js";

const client = new OdooClient(requireConfig());

async function main() {
  await client.authenticate();

  const orders = await client.searchRead(
    "sale.order",
    [
      "|",
      ["partner_id.name", "ilike", "Client Demo Plantilles MNL"],
      ["client_order_ref", "ilike", "Coberta demo MNL"],
    ],
    ["id", "name", "partner_id", "client_order_ref", "state", "company_id", "user_id", "date_order", "amount_total"],
    { limit: 20, order: "id desc" },
  );

  const reports = await client.searchRead(
    "ir.actions.report",
    [["report_name", "ilike", "mnl_solutions.report_saleorder_style_"]],
    ["id", "name", "model", "report_name", "report_type", "binding_model_id", "binding_type"],
    { limit: 20, order: "id" },
  );

  const model = await client.searchRead("ir.model", [["model", "=", "sale.order"]], ["id", "name", "model"], { limit: 1 });

  console.log(JSON.stringify({ database: client.database, uid: client.uid, saleOrderModel: model, orders, reports }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exitCode = 1;
});
