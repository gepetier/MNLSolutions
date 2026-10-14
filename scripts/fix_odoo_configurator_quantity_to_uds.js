import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { requireConfig } from "../src/config.js";
import { OdooClient } from "../src/odooClient.js";

const client = new OdooClient(requireConfig());
const AUTOMATION_NAME = "Copiar cantidad inicial a UDS";

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

const ACTION_CODE = `
for record in records or []:
    product_name = (record.product_id.name or '').strip().lower() if record.product_id else ''
    is_discount = product_name in ['descuento', 'descompte', 'discount']
    if record.product_id and not record.display_type and not record.is_downpayment and not is_discount:
        qty = record.product_uom_qty or 0.0
        longitud = record.x_studio_long or 0.0
        ancho = record.x_studio_ancho_1 or 0.0
        if qty > 0 and not longitud and not ancho and record.x_studio_uds != qty:
            record.update({'x_studio_uds': qty})
`;

async function main() {
  await client.authenticate();

  const [model] = await client.searchRead(
    "ir.model",
    [["model", "=", "sale.order.line"]],
    ["id"],
    { limit: 1 },
  );
  const [productField] = await client.searchRead(
    "ir.model.fields",
    [["model", "=", "sale.order.line"], ["name", "=", "product_id"]],
    ["id"],
    { limit: 1 },
  );
  const [quantityField] = await client.searchRead(
    "ir.model.fields",
    [["model", "=", "sale.order.line"], ["name", "=", "product_uom_qty"]],
    ["id"],
    { limit: 1 },
  );
  if (!model || !productField || !quantityField) {
    throw new Error("No trobo el model o els camps necessaris de sale.order.line.");
  }

  const [automation] = await client.searchRead(
    "base.automation",
    [["name", "=", AUTOMATION_NAME], ["model_id", "=", model.id]],
    ["id", "name", "active", "trigger", "trigger_field_ids", "action_server_ids"],
    { limit: 1 },
  );
  if (!automation) throw new Error(`No trobo l'automatitzacio '${AUTOMATION_NAME}'.`);
  if (automation.action_server_ids.length !== 1) {
    throw new Error(`Esperava una accio a l'automatitzacio ${automation.id} i n'he trobat ${automation.action_server_ids.length}.`);
  }
  const [action] = await client.searchRead(
    "ir.actions.server",
    [["id", "=", automation.action_server_ids[0]]],
    ["id", "name", "code"],
    { limit: 1 },
  );
  if (!action) throw new Error(`No trobo l'accio ${automation.action_server_ids[0]}.`);

  mkdirSync("logs", { recursive: true });
  const backupFile = join("logs", `odoo-configurator-quantity-backup-${client.database}-${stamp()}.json`);
  writeFileSync(backupFile, JSON.stringify({ database: client.database, action, automation }, null, 2));

  await client.write("ir.actions.server", [action.id], { code: ACTION_CODE });
  await client.write("base.automation", [automation.id], {
    active: true,
    trigger: "on_change",
    trigger_field_ids: [[6, 0, [productField.id, quantityField.id]]],
  });

  const result = {
    database: client.database,
    actionId: action.id,
    automationId: automation.id,
    triggerFieldIds: [productField.id, quantityField.id],
    backupFile,
  };
  const logFile = join("logs", `odoo-configurator-quantity-install-${client.database}-${stamp()}.json`);
  writeFileSync(logFile, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ ...result, logFile }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exitCode = 1;
});
