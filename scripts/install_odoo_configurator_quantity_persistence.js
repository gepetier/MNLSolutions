import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { requireConfig } from "../src/config.js";
import { OdooClient } from "../src/odooClient.js";

const client = new OdooClient(requireConfig());
const ACTION_NAME = "MNL - Persist configurator quantity to UDS action";
const AUTOMATION_NAME = "MNL - Persist configurator quantity to UDS";

const ACTION_CODE = `
for record in records or []:
    product_name = (record.product_id.name or '').strip().lower() if record.product_id else ''
    is_discount = product_name in ['descuento', 'descompte', 'discount']
    if record.product_id and not record.display_type and not record.is_downpayment and not is_discount:
        qty = record.product_uom_qty or 0.0
        longitud = record.x_studio_long or 0.0
        ancho = record.x_studio_ancho_1 or 0.0
        if qty > 0 and not longitud and not ancho and record.x_studio_uds != qty:
            record.write({'x_studio_uds': qty})
`;

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function main() {
  await client.authenticate();
  const [model] = await client.searchRead("ir.model", [["model", "=", "sale.order.line"]], ["id"], { limit: 1 });
  const [quantityField] = await client.searchRead(
    "ir.model.fields",
    [["model", "=", "sale.order.line"], ["name", "=", "product_uom_qty"]],
    ["id"],
    { limit: 1 },
  );
  if (!model || !quantityField) throw new Error("No trobo sale.order.line o product_uom_qty.");

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
  const backupFile = join("logs", `odoo-configurator-persistence-backup-${client.database}-${stamp()}.json`);
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
    trigger: "on_create_or_write",
    trigger_field_ids: [[6, 0, [quantityField.id]]],
    action_server_ids: [[6, 0, [actionId]]],
  };
  let automationId;
  if (oldAutomation) {
    await client.write("base.automation", [oldAutomation.id], automationValues);
    automationId = oldAutomation.id;
  } else {
    automationId = await client.create("base.automation", automationValues);
  }

  const result = { database: client.database, actionId, automationId, quantityFieldId: quantityField.id, backupFile };
  const logFile = join("logs", `odoo-configurator-persistence-install-${client.database}-${stamp()}.json`);
  writeFileSync(logFile, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ ...result, logFile }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exitCode = 1;
});
