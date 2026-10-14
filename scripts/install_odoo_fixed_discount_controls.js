import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { requireConfig } from "../src/config.js";
import { OdooClient } from "../src/odooClient.js";

const client = new OdooClient(requireConfig());
const VIEW_NAME = "MNL - controls de descompte fix";
const ACTION_APPLY = "MNL - Aplicar descompte fix";
const ACTION_DISABLE = "MNL - Desactivar descompte fix";
const MODEL = "sale.order";

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function modelId() {
  const [model] = await client.searchRead("ir.model", [["model", "=", MODEL]], ["id"], { limit: 1 });
  if (!model) throw new Error(`No trobo el model ${MODEL}.`);
  return model.id;
}

async function upsertField(model_id, values) {
  const [existing] = await client.searchRead(
    "ir.model.fields",
    [["model_id", "=", model_id], ["name", "=", values.name]],
    ["id"],
    { limit: 1 },
  );
  if (existing) {
    await client.write("ir.model.fields", [existing.id], values);
    return existing.id;
  }
  return client.create("ir.model.fields", { model_id, state: "manual", store: true, ...values });
}

async function upsertAction(name, model_id, code) {
  const [existing] = await client.searchRead(
    "ir.actions.server",
    [["name", "=", name], ["model_id", "=", model_id]],
    ["id"],
    { limit: 1 },
  );
  const values = { name, model_id, state: "code", code };
  if (existing) {
    await client.write("ir.actions.server", [existing.id], values);
    return existing.id;
  }
  return client.create("ir.actions.server", values);
}

const APPLY_CODE = `
for record in records:
    amount = record.x_mnl_descompte_fix_import or 0.0
    if amount <= 0:
        raise UserError("Indica un import de descompte superior a zero.")

    discount_product = env['product.product'].search([('name', '=', 'Descuento')], limit=1)
    if not discount_product:
        raise UserError("No trobo el producte estàndard 'Descuento'.")

    source_line = False
    for line in record.order_line:
        if not line.display_type and line.product_id and line.product_id != discount_product and line.product_uom_qty > 0:
            source_line = line
            break
    if not source_line:
        raise UserError("Afegeix primer una línia de producte amb quantitat per poder calcular el descompte.")

    taxes = source_line.tax_ids
    factor = 1.0
    for tax in taxes:
        if tax.amount_type == 'percent':
            factor += (tax.amount or 0.0) / 100.0

    mode = record.x_mnl_descompte_fix_iva or 'before_tax'
    unit_price = -amount
    if mode == 'after_tax' and factor:
        unit_price = -(amount / factor)

    target = False
    for line in record.order_line:
        if not line.display_type and line.product_id == discount_product:
            if not target or line.product_uom_qty:
                target = line

    values = {
        'name': 'Descompte MNL (%s)' % ('despres IVA' if mode == 'after_tax' else 'abans IVA'),
        'product_uom_qty': 1.0,
        'price_unit': unit_price,
        'tax_ids': [(6, 0, taxes.ids)],
    }
    if target:
        for line in record.order_line:
            if not line.display_type and line.product_id == discount_product and line != target and line.product_uom_qty:
                line.write({'product_uom_qty': 0.0})
        target.write(values)
    else:
        values.update({'order_id': record.id, 'product_id': discount_product.id})
        env['sale.order.line'].create(values)

action = {
    'type': 'ir.actions.act_window',
    'res_model': 'sale.order',
    'res_id': record.id,
    'view_mode': 'form',
    'target': 'current',
}
`;

const DISABLE_CODE = `
for record in records:
    discount_product = env['product.product'].search([('name', '=', 'Descuento')], limit=1)
    if discount_product:
        for line in record.order_line:
            if not line.display_type and line.product_id == discount_product and line.product_uom_qty:
                line.write({'product_uom_qty': 0.0})
    record.write({'x_mnl_descompte_fix_import': 0.0})

action = {
    'type': 'ir.actions.act_window',
    'res_model': 'sale.order',
    'res_id': record.id,
    'view_mode': 'form',
    'target': 'current',
}
`;

function viewArch(applyActionId, disableActionId) {
  return `<data>
  <xpath expr="//div[@name='so_button_below_order_lines']/button[@name='action_open_discount_wizard'][1]" position="attributes">
    <attribute name="invisible">locked or state in ['sale', 'cancel']</attribute>
  </xpath>
  <xpath expr="//page[@name='mnl_prices']//group[@name='mnl_prices_fields']" position="after">
    <group name="mnl_fixed_discount" string="Descompte fix MNL" col="2">
      <field name="x_mnl_descompte_fix_import" string="Import fix"/>
      <field name="x_mnl_descompte_fix_iva" string="Aplicar import" invisible="not x_mnl_descompte_fix_import"/>
      <button name="${applyActionId}" type="action" string="Aplicar / actualitzar" class="btn-primary" icon="fa-check" invisible="not x_mnl_descompte_fix_import"/>
      <button name="${disableActionId}" type="action" string="Desactivar" class="btn-secondary" icon="fa-times" confirm="Es posarà la quantitat del descompte a zero, sense eliminar cap línia de la comanda."/>
      <div class="text-muted" colspan="2">Després d'impostos manté l'import final indicat; abans d'impostos hi aplica l'IVA de la comanda.</div>
    </group>
  </xpath>
</data>`;
}

async function upsertView(arch) {
  const [existing] = await client.searchRead("ir.ui.view", [["name", "=", VIEW_NAME], ["model", "=", MODEL]], ["id"], { limit: 1 });
  const base = await client.searchRead("ir.ui.view", [["id", "=", 2023]], ["id"], { limit: 1 });
  if (!base.length) throw new Error("No trobo la vista base de comandes de venda.");
  const values = { name: VIEW_NAME, model: MODEL, type: "form", mode: "extension", inherit_id: base[0].id, priority: 96, arch_db: arch };
  if (existing) {
    await client.write("ir.ui.view", [existing.id], values);
    return existing.id;
  }
  return client.create("ir.ui.view", values);
}

async function backup(model_id) {
  const fields = await client.searchRead("ir.model.fields", [["model_id", "=", model_id], ["name", "in", ["x_mnl_descompte_fix_import", "x_mnl_descompte_fix_iva"]]], ["id", "name", "field_description", "ttype", "selection"], { limit: 5 });
  const actions = await client.searchRead("ir.actions.server", [["name", "in", [ACTION_APPLY, ACTION_DISABLE]], ["model_id", "=", model_id]], ["id", "name", "code"], { limit: 5 });
  const views = await client.searchRead("ir.ui.view", [["name", "=", VIEW_NAME], ["model", "=", MODEL]], ["id", "name", "arch_db"], { limit: 5 });
  mkdirSync("logs", { recursive: true });
  const file = join("logs", `odoo-fixed-discount-backup-${client.database}-${stamp()}.json`);
  writeFileSync(file, JSON.stringify({ database: client.database, backedUpAt: new Date().toISOString(), fields, actions, views }, null, 2));
  return file;
}

async function main() {
  await client.authenticate();
  const saleOrderModelId = await modelId();
  if (process.argv.includes("--inspect")) {
    console.log(JSON.stringify({ database: client.database, modelId: saleOrderModelId }, null, 2));
    return;
  }
  const backupFile = await backup(saleOrderModelId);
  const importFieldId = await upsertField(saleOrderModelId, {
    name: "x_mnl_descompte_fix_import",
    field_description: "Import fix del descompte MNL",
    ttype: "float",
  });
  const taxModeFieldId = await upsertField(saleOrderModelId, {
    name: "x_mnl_descompte_fix_iva",
    field_description: "Moment fiscal del descompte fix",
    ttype: "selection",
    selection: "[('before_tax', 'Abans d impostos'), ('after_tax', 'Despres d impostos')]",
  });
  const applyActionId = await upsertAction(ACTION_APPLY, saleOrderModelId, APPLY_CODE);
  const disableActionId = await upsertAction(ACTION_DISABLE, saleOrderModelId, DISABLE_CODE);
  const viewId = await upsertView(viewArch(applyActionId, disableActionId));
  const result = { database: client.database, backupFile, fields: { importFieldId, taxModeFieldId }, actions: { applyActionId, disableActionId }, viewId };
  const logFile = join("logs", `odoo-fixed-discount-install-${client.database}-${stamp()}.json`);
  writeFileSync(logFile, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ ...result, logFile }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exitCode = 1;
});
