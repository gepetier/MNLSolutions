import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { requireConfig } from "../src/config.js";
import { OdooClient } from "../src/odooClient.js";

const AUTOMATION_IDS = [2, 4, 5, 6];
const ACTION_IDS = [741, 742, 743, 744];

const CALCULATE_CODE = `uds = record.x_studio_uds or 0.0
longitud = record.x_studio_long or 0.0
ancho = record.x_studio_ancho_1 or 0.0

# No recalcular fins que la linia tingui totes les dimensions.
# Evita que una linia mig omplerta substitueixi la quantitat per un valor provisional.
if uds and longitud and ancho:
    total = uds * longitud * ancho

    record.update({
        'product_uom_qty': total,
        'x_studio_cantidad': total,
        'x_studio_total': total,
    })`;

const COPY_UDS_CODE = `uds = record.product_uom_qty or 0.0
longitud = record.x_studio_long or 0.0
ancho = record.x_studio_ancho_1 or 0.0

# Copiem la quantitat inicial nomes mentre encara no hi ha dimensions
# i mentre UDS encara no s'ha informat manualment.
if uds and not record.x_studio_uds and not longitud and not ancho:
    record.update({
        'x_studio_uds': uds,
    })`;

const client = new OdooClient(requireConfig());

async function readRows(model, ids, fields) {
  return client.searchRead(model, [["id", "in", ids]], fields, { limit: ids.length + 5, order: "id" });
}

async function fieldId(name) {
  const [field] = await client.searchRead(
    "ir.model.fields",
    [["model", "=", "sale.order.line"], ["name", "=", name]],
    ["id", "name", "field_description"],
    { limit: 1 },
  );
  if (!field) {
    throw new Error(`No trobo el camp sale.order.line.${name}`);
  }
  return field.id;
}

async function backup() {
  const automations = await readRows("base.automation", AUTOMATION_IDS, [
    "id",
    "name",
    "active",
    "model_id",
    "trigger",
    "trigger_field_ids",
    "filter_domain",
    "action_server_ids",
  ]);
  const actions = await readRows("ir.actions.server", ACTION_IDS, ["id", "name", "model_id", "state", "usage", "code"]);
  const payload = {
    generatedAt: new Date().toISOString(),
    database: client.database,
    automations,
    actions,
  };
  mkdirSync("logs", { recursive: true });
  const path = resolve("logs", `odoo-automation-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return path;
}

async function applyOptimization() {
  const fields = {
    productUomQty: await fieldId("product_uom_qty"),
    productId: await fieldId("product_id"),
    uds: await fieldId("x_studio_uds"),
    long: await fieldId("x_studio_long"),
    ancho: await fieldId("x_studio_ancho_1"),
    classificador: await fieldId("x_studio_classificador"),
  };

  await client.write("base.automation", [2], { trigger_field_ids: [[6, 0, [fields.uds, fields.long, fields.ancho]]] });
  await client.write("base.automation", [4], { trigger_field_ids: [[6, 0, [fields.productUomQty]]] });
  await client.write("base.automation", [5], { trigger_field_ids: [[6, 0, [fields.productId]]] });
  await client.write("base.automation", [6], { trigger_field_ids: [[6, 0, [fields.classificador]]] });

  await client.write("ir.actions.server", [741], { code: CALCULATE_CODE });
  await client.write("ir.actions.server", [742], { code: COPY_UDS_CODE });

  return fields;
}

async function ensureTestPartner() {
  const name = "CLIENT TEST AUTOMATITZACIO CODEX";
  const [found] = await client.searchRead("res.partner", [["name", "=", name]], ["id", "name"], { limit: 1 });
  if (found) return found.id;
  return client.create("res.partner", { name, email: "test-automatitzacio@example.invalid" });
}

async function findTestProduct() {
  const [product] = await client.searchRead(
    "product.product",
    [["sale_ok", "=", true]],
    ["id", "name", "default_code"],
    { limit: 1, order: "id desc" },
  );
  if (!product) {
    throw new Error("No trobo cap producte vendible per fer la prova.");
  }
  return product;
}

async function runServerAction(actionId, lineId) {
  return client.call("ir.actions.server", "run", [[actionId]], {
    context: {
      active_model: "sale.order.line",
      active_id: lineId,
      active_ids: [lineId],
    },
  });
}

async function testAutomationActions() {
  const partnerId = await ensureTestPartner();
  const product = await findTestProduct();
  const orderId = await client.create("sale.order", {
    partner_id: partnerId,
    client_order_ref: `TEST-AUTO-${new Date().toISOString()}`,
  });
  const lineId = await client.create("sale.order.line", {
    order_id: orderId,
    product_id: product.id,
    name: `Prova automatitzacio - ${product.name}`,
    product_uom_qty: 22,
    price_unit: 10,
  });

  await runServerAction(742, lineId);
  let [line] = await client.searchRead(
    "sale.order.line",
    [["id", "=", lineId]],
    ["id", "product_uom_qty", "x_studio_uds", "x_studio_long", "x_studio_ancho_1", "x_studio_cantidad", "x_studio_total"],
    { limit: 1 },
  );
  const copiedUds = Number(line.x_studio_uds) === 22;

  await client.write("sale.order.line", [lineId], {
    x_studio_long: 6,
    x_studio_ancho_1: 1.15,
  });
  await runServerAction(741, lineId);
  [line] = await client.searchRead(
    "sale.order.line",
    [["id", "=", lineId]],
    ["id", "product_uom_qty", "x_studio_uds", "x_studio_long", "x_studio_ancho_1", "x_studio_cantidad", "x_studio_total"],
    { limit: 1 },
  );
  const expected = 151.8;
  const calculated =
    Math.abs(Number(line.product_uom_qty) - expected) < 0.0001 &&
    Math.abs(Number(line.x_studio_cantidad) - expected) < 0.0001 &&
    Math.abs(Number(line.x_studio_total) - expected) < 0.0001;

  await runServerAction(743, lineId);
  await runServerAction(744, lineId);
  const [testedLine] = await client.searchRead(
    "sale.order.line",
    [["id", "=", lineId]],
    ["id", "product_uom_qty", "x_studio_uds", "x_studio_long", "x_studio_ancho_1", "x_studio_cantidad", "x_studio_total", "x_studio_classificador", "sequence"],
    { limit: 1 },
  );
  const [order] = await client.searchRead("sale.order", [["id", "=", orderId]], ["id", "name", "client_order_ref", "amount_total"], { limit: 1 });

  return {
    order,
    product,
    line: testedLine,
    checks: {
      copiedUds,
      expectedM2: expected,
      calculatedM2: calculated,
      hasClassificador: Boolean(testedLine.x_studio_classificador),
    },
  };
}

async function main() {
  await client.authenticate();
  const backupFile = await backup();
  const fieldIds = await applyOptimization();
  const test = await testAutomationActions();

  const ok = test.checks.copiedUds && test.checks.calculatedM2 && test.checks.hasClassificador;
  console.log(
    JSON.stringify(
      {
        ok,
        database: client.database,
        backupFile,
        fieldIds,
        test,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exitCode = 1;
});
