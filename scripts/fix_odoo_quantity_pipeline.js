import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { requireConfig } from "../src/config.js";
import { OdooClient } from "../src/odooClient.js";

const client = new OdooClient(requireConfig());

const UI_CODE = `values_to_return = {}
for record in records or []:
    incoming_qty = record.product_uom_qty or 0.0
    uds = record.x_studio_uds or 0.0
    longitud = record.x_studio_long or 0.0
    ancho = record.x_studio_ancho_1 or 0.0
    if incoming_qty > 0 and not longitud and not ancho and uds != incoming_qty:
        uds = incoming_qty
        values_to_return['x_studio_uds'] = uds
    calculation_type = record.x_studio_tipus_calcul or 'uds'
    if calculation_type == 'm2':
        total = uds * longitud * ancho if uds > 0 and longitud > 0 and ancho > 0 else 0.0
    elif calculation_type == 'ml':
        total = uds * longitud if uds > 0 and longitud > 0 else 0.0
    else:
        total = uds
    discount = record.discount or 0.0
    importe_mnl = total * (record.price_unit or 0.0) * (1.0 - discount / 100.0)
    values_to_return.update(dict(product_uom_qty=total, x_studio_cantidad=total, x_studio_total=total, x_studio_importe_mnl=importe_mnl))
action = dict(value=values_to_return)`;

const PERSIST_CODE = `for record in records or []:
    incoming_qty = record.product_uom_qty or 0.0
    uds = record.x_studio_uds or 0.0
    longitud = record.x_studio_long or 0.0
    ancho = record.x_studio_ancho_1 or 0.0
    if incoming_qty > 0 and not longitud and not ancho and uds != incoming_qty:
        uds = incoming_qty
        record.update(dict(x_studio_uds=uds))
    calculation_type = record.x_studio_tipus_calcul or 'uds'
    if calculation_type == 'm2':
        total = uds * longitud * ancho if uds > 0 and longitud > 0 and ancho > 0 else 0.0
    elif calculation_type == 'ml':
        total = uds * longitud if uds > 0 and longitud > 0 else 0.0
    else:
        total = uds
    if record.product_uom_qty != total:
        record.update(dict(product_uom_qty=total))
    order = record.order_id
    if order:
        base = round(sum(line.x_studio_importe_mnl or 0.0 for line in order.order_line if not line.display_type), 2)
        tipus_iva = (order.amount_tax / order.amount_untaxed) if order.amount_untaxed else 0.0
        iva = round(base * tipus_iva, 2)
        order_values = dict(x_studio_base_mnl=base, x_studio_iva_mnl=iva, x_studio_total_mnl=round(base + iva, 2))
        if order.x_studio_base_mnl != base or order.x_studio_iva_mnl != iva or order.x_studio_total_mnl != round(base + iva, 2):
            order.write(order_values)`;

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function fieldId(name) {
  const [field] = await client.searchRead(
    "ir.model.fields",
    [["model", "=", "sale.order.line"], ["name", "=", name]],
    ["id"],
    { limit: 1 },
  );
  if (!field) throw new Error(`No trobo sale.order.line.${name}.`);
  return field.id;
}

async function automation(name) {
  const [row] = await client.searchRead(
    "base.automation",
    [["name", "=", name]],
    ["id", "name", "trigger", "trigger_field_ids", "action_server_ids"],
    { limit: 1 },
  );
  if (!row || row.action_server_ids.length !== 1) throw new Error(`No trobo una accio unica per a '${name}'.`);
  return row;
}

async function main() {
  await client.authenticate();
  if (!process.argv.includes("--apply")) {
    throw new Error("Operació d'escriptura: torna a executar amb --apply i ODOO_ENV_FILE=112.env.");
  }
  const productionApply = process.argv.includes("--production") && client.database === "mnl-technical-consultant";
  const testApply = process.argv.includes("--test") && /^provesmnl\d+$/.test(client.database);
  if (!productionApply && !testApply) {
    throw new Error(`Indica --test per a una base provesmnl o --production per a mnl-technical-consultant; base actual: ${client.database}.`);
  }
  const fields = {
    qty: await fieldId("product_uom_qty"),
    uds: await fieldId("x_studio_uds"),
    long: await fieldId("x_studio_long"),
    ancho: await fieldId("x_studio_ancho_1"),
  };
  const uiAutomation = await automation("Calcular cantidad y total línea");
  const persistAutomation = await automation("MNL - Persist dimensions and line amount");
  const actionIds = [uiAutomation.action_server_ids[0], persistAutomation.action_server_ids[0]];
  const actions = await client.searchRead("ir.actions.server", [["id", "in", actionIds]], ["id", "name", "code"], { limit: 5 });
  const duplicateAutomations = await client.searchRead(
    "base.automation",
    [["name", "in", ["MNL - Persist dimensions and line amount TEST", "MNL - Persist dimensions and line amount TEST2"]]],
    ["id", "name", "active", "trigger", "trigger_field_ids", "action_server_ids"],
    { limit: 10, context: { active_test: false } },
  );

  mkdirSync("logs", { recursive: true });
  const backupFile = join("logs", `odoo-quantity-pipeline-backup-${client.database}-${stamp()}.json`);
  writeFileSync(backupFile, JSON.stringify({ database: client.database, fields, uiAutomation, persistAutomation, actions, duplicateAutomations }, null, 2));

  const triggerIds = [fields.qty, fields.uds, fields.long, fields.ancho];
  await client.write("base.automation", [uiAutomation.id], { trigger_field_ids: [[6, 0, triggerIds]] });
  await client.write("base.automation", [persistAutomation.id], { trigger_field_ids: [[6, 0, triggerIds]] });
  await client.write("ir.actions.server", [uiAutomation.action_server_ids[0]], { code: UI_CODE });
  await client.write("ir.actions.server", [persistAutomation.action_server_ids[0]], { code: PERSIST_CODE });
  const disabledDuplicateIds = duplicateAutomations.filter((item) => item.active).map((item) => item.id);
  if (disabledDuplicateIds.length) await client.write("base.automation", disabledDuplicateIds, { active: false });

  const result = {
    database: client.database,
    uiAutomationId: uiAutomation.id,
    persistAutomationId: persistAutomation.id,
    actionIds,
    triggerIds,
    disabledDuplicateIds,
    backupFile,
  };
  const logFile = join("logs", `odoo-quantity-pipeline-install-${client.database}-${stamp()}.json`);
  writeFileSync(logFile, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ ...result, logFile }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exitCode = 1;
});
