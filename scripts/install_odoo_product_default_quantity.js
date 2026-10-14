import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { requireConfig } from "../src/config.js";
import { OdooClient } from "../src/odooClient.js";

const client = new OdooClient(requireConfig());
const ACTION_NAME = "MNL - UI quantitat minima en seleccionar producte";
const AUTOMATION_NAME = "MNL - Quantitat inicial minima per producte";

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

const ACTION_CODE = `
values_to_return = {}
for record in records or []:
    product_name = (record.product_id.name or '').strip().lower() if record.product_id else ''
    is_discount = product_name in ['descuento', 'descompte', 'discount']
    if record.product_id and not record.display_type and not record.is_downpayment and not is_discount:
        qty = record.product_uom_qty or 0.0
        uds = record.x_studio_uds or 0.0
        if qty <= 0 and uds <= 0:
            values_to_return.update({
                'product_uom_qty': 1.0,
            })
action = {'value': values_to_return}
`;

async function ids() {
  const [model] = await client.searchRead("ir.model", [["model", "=", "sale.order.line"]], ["id"], { limit: 1 });
  const [productField] = await client.searchRead("ir.model.fields", [["model", "=", "sale.order.line"], ["name", "=", "product_id"]], ["id"], { limit: 1 });
  if (!model || !productField) throw new Error("No trobo sale.order.line o el camp product_id.");
  return { modelId: model.id, productFieldId: productField.id };
}

async function backup(modelId) {
  const actions = await client.searchRead("ir.actions.server", [["name", "=", ACTION_NAME], ["model_id", "=", modelId]], ["id", "name", "code"], { limit: 5 });
  const automations = await client.searchRead("base.automation", [["name", "=", AUTOMATION_NAME], ["model_id", "=", modelId]], ["id", "name", "active", "trigger", "trigger_field_ids", "action_server_ids"], { limit: 5 });
  mkdirSync("logs", { recursive: true });
  const file = join("logs", `odoo-product-default-quantity-backup-${client.database}-${stamp()}.json`);
  writeFileSync(file, JSON.stringify({ database: client.database, backedUpAt: new Date().toISOString(), actions, automations }, null, 2));
  return file;
}

async function upsertAction(modelId) {
  const [existing] = await client.searchRead("ir.actions.server", [["name", "=", ACTION_NAME], ["model_id", "=", modelId]], ["id"], { limit: 1 });
  const values = { name: ACTION_NAME, model_id: modelId, state: "code", code: ACTION_CODE };
  if (existing) {
    await client.write("ir.actions.server", [existing.id], values);
    return existing.id;
  }
  return client.create("ir.actions.server", values);
}

async function upsertAutomation(modelId, productFieldId, actionId) {
  const [existing] = await client.searchRead("base.automation", [["name", "=", AUTOMATION_NAME], ["model_id", "=", modelId]], ["id"], { limit: 1 });
  const values = {
    name: AUTOMATION_NAME,
    model_id: modelId,
    active: true,
    trigger: "on_change",
    trigger_field_ids: [[6, 0, [productFieldId]]],
    action_server_ids: [[6, 0, [actionId]]],
  };
  if (existing) {
    await client.write("base.automation", [existing.id], values);
    return existing.id;
  }
  return client.create("base.automation", values);
}

async function main() {
  await client.authenticate();
  const { modelId, productFieldId } = await ids();
  const backupFile = await backup(modelId);
  const actionId = await upsertAction(modelId);
  const automationId = await upsertAutomation(modelId, productFieldId, actionId);
  const result = { database: client.database, backupFile, actionId, automationId, productFieldId };
  const logFile = join("logs", `odoo-product-default-quantity-install-${client.database}-${stamp()}.json`);
  writeFileSync(logFile, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ ...result, logFile }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exitCode = 1;
});
