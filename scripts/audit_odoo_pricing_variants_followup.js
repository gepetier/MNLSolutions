import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { requireConfig } from "../src/config.js";
import { OdooClient } from "../src/odooClient.js";

const client = new OdooClient(requireConfig());

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function fields(model) {
  return client.fieldsGet(model, []);
}

function pick(spec, names) {
  return names.filter((name) => spec[name]);
}

async function sr(model, domain, wanted, kwargs = {}) {
  const spec = await fields(model);
  return client.searchRead(model, domain, pick(spec, wanted), kwargs);
}

async function main() {
  await client.authenticate();

  const studioFields = await sr(
    "ir.model.fields",
    [["name", "ilike", "x_studio_"]],
    ["id", "name", "field_description", "model", "model_id", "ttype", "relation", "store", "readonly", "required", "compute", "depends", "related", "modules"],
    { limit: 500, order: "model,name" },
  );

  const keywordFieldBatches = {};
  for (const keyword of ["cost", "marge", "margin", "price", "preu", "proveidor", "variant", "cantidad", "total", "long", "ancho", "classificador"]) {
    keywordFieldBatches[keyword] = await sr(
      "ir.model.fields",
      [
        "|",
        ["name", "ilike", keyword],
        ["field_description", "ilike", keyword],
      ],
      ["id", "name", "field_description", "model", "ttype", "relation", "store", "readonly", "compute", "depends", "related", "modules"],
      { limit: 120, order: "model,name" },
    );
  }

  const templates = await sr(
    "product.template",
    [],
    ["id", "name", "default_code", "list_price", "standard_price", "product_variant_count", "attribute_line_ids", "product_variant_ids", "seller_ids", "categ_id"],
    { limit: 80, order: "id" },
  );

  const nameSearches = {};
  for (const term of ["HI-CT", "QuadCore", "Panell", "HI"]) {
    nameSearches[term] = await sr(
      "product.template",
      [["name", "ilike", term]],
      ["id", "name", "default_code", "list_price", "standard_price", "product_variant_count", "attribute_line_ids", "product_variant_ids", "seller_ids"],
      { limit: 30, order: "id" },
    );
  }

  const candidate = templates.find((template) => Number(template.product_variant_count || 0) > 1) || templates[0];
  let example = null;
  if (candidate) {
    example = {
      template: candidate,
      attributeLines: await sr(
        "product.template.attribute.line",
        [["product_tmpl_id", "=", candidate.id]],
        ["id", "attribute_id", "value_ids", "product_template_value_ids", "active"],
        { limit: 100, order: "id" },
      ),
      ptavs: await sr(
        "product.template.attribute.value",
        [["product_tmpl_id", "=", candidate.id]],
        ["id", "name", "attribute_id", "product_attribute_value_id", "price_extra", "ptav_product_variant_ids"],
        { limit: 200, order: "attribute_id,id" },
      ),
      variants: await sr(
        "product.product",
        [["product_tmpl_id", "=", candidate.id]],
        ["id", "display_name", "default_code", "lst_price", "list_price", "standard_price", "price_extra", "product_template_attribute_value_ids", "product_template_variant_value_ids", "seller_ids", "variant_seller_ids"],
        { limit: 120, order: "id" },
      ),
      suppliers: await sr(
        "product.supplierinfo",
        [["product_tmpl_id", "=", candidate.id]],
        ["id", "partner_id", "product_tmpl_id", "product_id", "price", "currency_id", "min_qty", "delay", "sequence", "product_code", "product_name"],
        { limit: 120, order: "sequence,id" },
      ),
    };
  }

  const automations = await sr(
    "base.automation",
    [],
    ["id", "name", "active", "model_id", "trigger", "trigger_field_ids", "filter_domain", "action_server_ids"],
    { limit: 100, order: "model_id,name" },
  );

  const serverActions = await sr(
    "ir.actions.server",
    [],
    ["id", "name", "model_id", "binding_model_id", "state", "code", "usage", "active"],
    { limit: 250, order: "model_id,name" },
  );

  const views = {};
  for (const field of studioFields.map((f) => f.name)) {
    views[field] = await sr(
      "ir.ui.view",
      [["arch_db", "ilike", field]],
      ["id", "name", "model", "type", "key", "inherit_id", "active"],
      { limit: 50, order: "model,name" },
    );
  }

  const saleLines = await sr(
    "sale.order.line",
    [],
    ["id", "order_id", "product_id", "product_template_id", "product_uom_qty", "product_uom_id", "price_unit", "discount", "price_subtotal", "price_total", "x_studio_uds", "x_studio_long", "x_studio_ancho_1", "x_studio_cantidad", "x_studio_total", "x_studio_classificador", "x_studio_precio", "x_studio_importe"],
    { limit: 40, order: "id desc" },
  );

  const output = {
    database: client.database,
    auditedAt: new Date().toISOString(),
    studioFields,
    keywordFieldBatches,
    templates,
    nameSearches,
    example,
    automations,
    serverActions,
    views,
    saleLines,
  };
  const file = join("logs", `odoo-pricing-variants-followup-${client.database}-${stamp()}.json`);
  writeFileSync(file, JSON.stringify(output, null, 2));
  console.log(JSON.stringify({ file, templates: templates.length, studioFields: studioFields.length, exampleTemplate: candidate }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exitCode = 1;
});
