import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { requireConfig } from "../src/config.js";
import { OdooClient } from "../src/odooClient.js";

const client = new OdooClient(requireConfig());
const ACTION_NAME = "MNL - UI bridge configurator quantity to UDS action";
const AUTOMATION_NAME = "MNL - UI bridge configurator quantity to UDS";

const ACTION_CODE = `
for order in records or []:
    for line in order.order_line:
        product_name = (line.product_id.name or '').strip().lower() if line.product_id else ''
        is_discount = product_name in ['descuento', 'descompte', 'discount']
        if line.product_id and not line.display_type and not line.is_downpayment and not is_discount:
            qty = line.product_uom_qty or 0.0
            longitud = line.x_studio_long or 0.0
            ancho = line.x_studio_ancho_1 or 0.0
            if qty > 0 and not longitud and not ancho and line.x_studio_uds != qty:
                line.update({'x_studio_uds': qty})
`;

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function main() {
  await client.authenticate();
  const [model] = await client.searchRead("ir.model", [["model", "=", "sale.order"]], ["id"], { limit: 1 });
  const [orderLineField] = await client.searchRead(
    "ir.model.fields",
    [["model", "=", "sale.order"], ["name", "=", "order_line"]],
    ["id"],
    { limit: 1 },
  );
  if (!model || !orderLineField) throw new Error("No trobo sale.order o order_line.");

  const [oldAction] = await client.searchRead(
    "ir.actions.server",
    [["name", "=", ACTION_NAME], ["model_id", "=", model.id]],
    ["id", "name", "code"],
    { limit: 1 },
  );
  const [oldAutomation] = await client.searchRead(
    "base.automation",
    [["name", "=", AUTOMATION_NAME], ["model_id", "=", model.id]],
    ["id", "name", "active", "trigger", "trigger_field_ids", "action_server_ids"],
    { limit: 1 },
  );

  mkdirSync("logs", { recursive: true });
  const backupFile = join("logs", `odoo-order-configurator-bridge-backup-${client.database}-${stamp()}.json`);
  writeFileSync(backupFile, JSON.stringify({ database: client.database, oldAction, oldAutomation }, null, 2));

  const actionValues = { name: ACTION_NAME, model_id: model.id, state: "code", code: ACTION_CODE };
  let actionId;
  if (oldAction) {
    await client.write("ir.actions.server", [oldAction.id], actionValues);
    actionId = oldAction.id;
  } else {
    actionId = await client.create("ir.actions.server", actionValues);
  }

  const automationValues = {
    name: AUTOMATION_NAME,
    model_id: model.id,
    active: true,
    trigger: "on_change",
    trigger_field_ids: [[6, 0, [orderLineField.id]]],
    action_server_ids: [[6, 0, [actionId]]],
  };
  let automationId;
  if (oldAutomation) {
    await client.write("base.automation", [oldAutomation.id], automationValues);
    automationId = oldAutomation.id;
  } else {
    automationId = await client.create("base.automation", automationValues);
  }

  const result = { database: client.database, actionId, automationId, orderLineFieldId: orderLineField.id, backupFile };
  const logFile = join("logs", `odoo-order-configurator-bridge-install-${client.database}-${stamp()}.json`);
  writeFileSync(logFile, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ ...result, logFile }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exitCode = 1;
});
