import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { requireConfig } from "../src/config.js";
import { OdooClient } from "../src/odooClient.js";

const config = requireConfig();
const client = new OdooClient(config);

const MODELS = [
  "product.template",
  "product.product",
  "product.attribute",
  "product.attribute.value",
  "product.template.attribute.line",
  "product.template.attribute.value",
  "product.supplierinfo",
  "product.pricelist",
  "product.pricelist.item",
  "sale.order",
  "sale.order.line",
  "res.partner",
  "res.company",
  "ir.model.fields",
  "ir.ui.view",
  "ir.actions.server",
  "base.automation",
  "ir.module.module",
  "ir.model",
];

const FIELD_KEYWORDS = [
  "cost",
  "marge",
  "margin",
  "price",
  "preu",
  "proveidor",
  "vendor",
  "supplier",
  "variant",
  "cantidad",
  "quantity",
  "total",
  "long",
  "ancho",
  "width",
  "classificador",
  "discount",
  "purchase",
  "standard",
  "extra",
];

const STUDIO_NAMES = [
  "x_studio_cost",
  "x_studio_marge",
  "x_studio_price",
  "x_studio_preu",
  "x_studio_proveidor",
  "x_studio_variant",
  "x_studio_cantidad",
  "x_studio_total",
  "x_studio_long",
  "x_studio_ancho",
  "x_studio_classificador",
];

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function fieldNames(fields, predicates) {
  return Object.keys(fields)
    .filter((name) => predicates.some((predicate) => predicate(name, fields[name])))
    .sort();
}

function pick(fields, names) {
  return names.filter((name) => fields[name]);
}

async function safe(label, fn, fallback = null) {
  try {
    return await fn();
  } catch (error) {
    return { error: `${label}: ${error.message}`, body: error.body };
  }
}

async function fieldsGet(model) {
  return safe(`fields_get ${model}`, () => client.fieldsGet(model, []), {});
}

async function searchRead(model, domain, fields, kwargs = {}) {
  return safe(`search_read ${model}`, () => client.searchRead(model, domain, fields, kwargs), []);
}

async function count(model, domain = []) {
  return safe(`count ${model}`, () => client.call(model, "search_count", [domain]), null);
}

async function getVersion() {
  return safe("common.version", () => client.jsonRpc("common", "version", []), {});
}

function interestingFields(model, fields) {
  const baseByModel = {
    "product.template": [
      "name",
      "default_code",
      "list_price",
      "standard_price",
      "cost_method",
      "property_cost_method",
      "categ_id",
      "seller_ids",
      "attribute_line_ids",
      "valid_product_template_attribute_line_ids",
      "product_variant_ids",
      "product_variant_count",
      "uom_id",
      "uom_po_id",
      "sale_ok",
      "purchase_ok",
      "detailed_type",
      "type",
      "taxes_id",
      "supplier_taxes_id",
      "currency_id",
    ],
    "product.product": [
      "name",
      "display_name",
      "default_code",
      "product_tmpl_id",
      "lst_price",
      "list_price",
      "standard_price",
      "price_extra",
      "product_template_variant_value_ids",
      "product_template_attribute_value_ids",
      "seller_ids",
      "variant_seller_ids",
      "uom_id",
      "uom_po_id",
      "sale_ok",
      "purchase_ok",
      "detailed_type",
      "type",
    ],
    "product.attribute": ["name", "display_type", "create_variant", "value_ids", "visibility"],
    "product.attribute.value": ["name", "attribute_id", "sequence", "html_color", "is_custom"],
    "product.template.attribute.line": ["product_tmpl_id", "attribute_id", "value_ids", "product_template_value_ids", "active"],
    "product.template.attribute.value": [
      "name",
      "product_tmpl_id",
      "attribute_id",
      "product_attribute_value_id",
      "price_extra",
      "ptav_product_variant_ids",
      "product_variant_ids",
      "exclude_for",
    ],
    "product.supplierinfo": [
      "partner_id",
      "product_tmpl_id",
      "product_id",
      "product_name",
      "product_code",
      "price",
      "currency_id",
      "min_qty",
      "delay",
      "sequence",
      "company_id",
      "date_start",
      "date_end",
    ],
    "product.pricelist": ["name", "active", "currency_id", "company_id", "item_ids", "discount_policy", "selectable"],
    "product.pricelist.item": [
      "pricelist_id",
      "applied_on",
      "product_tmpl_id",
      "product_id",
      "categ_id",
      "base",
      "base_pricelist_id",
      "compute_price",
      "fixed_price",
      "percent_price",
      "price_discount",
      "price_surcharge",
      "price_round",
      "price_min_margin",
      "price_max_margin",
      "min_quantity",
      "date_start",
      "date_end",
    ],
    "sale.order": ["name", "partner_id", "pricelist_id", "currency_id", "order_line", "amount_untaxed", "amount_tax", "amount_total", "state", "date_order"],
    "sale.order.line": [
      "order_id",
      "product_id",
      "product_template_id",
      "product_uom_qty",
      "product_uom",
      "product_uom_id",
      "price_unit",
      "purchase_price",
      "margin",
      "margin_percent",
      "discount",
      "tax_id",
      "price_subtotal",
      "price_total",
      "display_type",
      "currency_id",
      "name",
    ],
  };

  const keywords = fieldNames(fields, [
    (name) => name.startsWith("x_studio_"),
    (name, spec) => FIELD_KEYWORDS.some((keyword) => `${name} ${spec.string || ""}`.toLowerCase().includes(keyword)),
  ]);
  return [...new Set([...(baseByModel[model] || []), ...keywords])].filter((name) => fields[name]);
}

async function inspectModel(model) {
  const fields = await fieldsGet(model);
  return {
    model,
    exists: !fields.error,
    fieldCount: fields.error ? null : Object.keys(fields).length,
    error: fields.error,
    interesting: fields.error
      ? []
      : interestingFields(model, fields).map((name) => ({
          name,
          string: fields[name].string,
          type: fields[name].type,
          relation: fields[name].relation,
          readonly: fields[name].readonly,
          required: fields[name].required,
          store: fields[name].store,
          compute: fields[name].compute,
          related: fields[name].related,
          depends: fields[name].depends,
          selection: fields[name].selection,
        })),
  };
}

async function installedModules() {
  const moduleFields = await fieldsGet("ir.module.module");
  const fields = pick(moduleFields, ["id", "name", "shortdesc", "state", "latest_version", "installed_version"]);
  const keywords = ["sale", "purchase", "product", "stock", "account", "margin", "pricelist", "studio", "variant", "uom"];
  return searchRead(
    "ir.module.module",
    [["state", "=", "installed"], "|", "|", "|", "|", "|", "|", "|", "|", ["name", "ilike", keywords[0]], ["name", "ilike", keywords[1]], ["name", "ilike", keywords[2]], ["name", "ilike", keywords[3]], ["name", "ilike", keywords[4]], ["name", "ilike", keywords[5]], ["name", "ilike", keywords[6]], ["name", "ilike", keywords[7]], ["name", "ilike", keywords[8]]],
    fields,
    { limit: 200, order: "name" },
  );
}

async function studioAndCustomFields() {
  const modelFields = await fieldsGet("ir.model.fields");
  const fields = pick(modelFields, [
    "id",
    "name",
    "field_description",
    "model",
    "model_id",
    "ttype",
    "relation",
    "store",
    "readonly",
    "required",
    "compute",
    "depends",
    "related",
    "modules",
  ]);
  const domains = [
    ["name", "ilike", "x_studio_"],
    ...STUDIO_NAMES.map((name) => ["name", "ilike", name]),
    ...FIELD_KEYWORDS.map((keyword) => ["name", "ilike", keyword]),
    ...FIELD_KEYWORDS.map((keyword) => ["field_description", "ilike", keyword]),
  ];
  const domain = domains.length === 1 ? domains[0] : domains.slice(1).reduce((acc, d) => ["|", acc, d], domains[0]);
  return searchRead("ir.model.fields", domain, fields, { limit: 500, order: "model,name" });
}

async function viewsUsingCustomFields(customFields) {
  const names = [...new Set(customFields.map((f) => f.name).filter(Boolean))].slice(0, 80);
  if (!names.length) return [];
  const viewFields = await fieldsGet("ir.ui.view");
  const fields = pick(viewFields, ["id", "name", "model", "type", "key", "inherit_id", "active", "arch_db"]);
  const domain = names.slice(1).reduce((acc, name) => ["|", acc, ["arch_db", "ilike", name]], ["arch_db", "ilike", names[0]]);
  const views = await searchRead("ir.ui.view", domain, fields, { limit: 200, order: "model,name" });
  if (!Array.isArray(views)) return views;
  return views.map((view) => ({
    ...view,
    matchedFields: names.filter((name) => String(view.arch_db || "").includes(name)),
    arch_db: view.arch_db ? String(view.arch_db).slice(0, 1500) : view.arch_db,
  }));
}

async function automationsAndServerActions() {
  const automationFields = await fieldsGet("base.automation");
  const serverFields = await fieldsGet("ir.actions.server");
  const automationFieldList = pick(automationFields, [
    "id",
    "name",
    "active",
    "model_id",
    "trigger",
    "trigger_field_ids",
    "filter_domain",
    "action_server_ids",
    "state",
    "code",
    "write_field_id",
    "update_field_id",
    "value",
  ]);
  const serverFieldList = pick(serverFields, [
    "id",
    "name",
    "model_id",
    "binding_model_id",
    "state",
    "code",
    "crud_model_id",
    "fields_lines",
    "usage",
    "active",
  ]);
  const targetModels = ["sale.order.line", "sale.order", "product.template", "product.product", "product.supplierinfo", "product.pricelist.item"];
  const automations = await searchRead("base.automation", [["model_id.model", "in", targetModels]], automationFieldList, { limit: 200, order: "model_id,name" });
  const servers = await searchRead("ir.actions.server", [["model_id.model", "in", targetModels]], serverFieldList, { limit: 300, order: "model_id,name" });
  return { automations, serverActions: servers };
}

async function sampleData() {
  const samples = {};
  for (const model of ["product.attribute", "product.attribute.value", "product.pricelist", "product.pricelist.item", "product.supplierinfo"]) {
    const modelFields = await fieldsGet(model);
    samples[model] = await searchRead(model, [], interestingFields(model, modelFields), { limit: 30, order: "id desc" });
  }
  return samples;
}

async function productExample() {
  const templateFields = await fieldsGet("product.template");
  const productFields = await fieldsGet("product.product");
  const ptavFields = await fieldsGet("product.template.attribute.value");
  const lineFields = await fieldsGet("product.template.attribute.line");
  const supplierFields = await fieldsGet("product.supplierinfo");

  const baseTemplateFields = pick(templateFields, [
    "id",
    "name",
    "default_code",
    "list_price",
    "standard_price",
    "cost_method",
    "property_cost_method",
    "product_variant_count",
    "attribute_line_ids",
    "seller_ids",
    "categ_id",
  ]);

  let templates = await searchRead(
    "product.template",
    [["name", "ilike", "Panell HI-CT QuadCore"]],
    baseTemplateFields,
    { limit: 5, order: "product_variant_count desc,id" },
  );
  if (!Array.isArray(templates) || !templates.length) {
    templates = await searchRead(
      "product.template",
      [["product_variant_count", ">", 1]],
      baseTemplateFields,
      { limit: 10, order: "product_variant_count desc,id" },
    );
  }
  const template = Array.isArray(templates) ? templates[0] : null;
  if (!template) return { found: false, templates };

  const variants = await searchRead(
    "product.product",
    [["product_tmpl_id", "=", template.id]],
    pick(productFields, [
      "id",
      "display_name",
      "name",
      "default_code",
      "lst_price",
      "list_price",
      "standard_price",
      "price_extra",
      "product_template_attribute_value_ids",
      "product_template_variant_value_ids",
      "seller_ids",
      "variant_seller_ids",
    ]),
    { limit: 80, order: "id" },
  );

  const ptavs = await searchRead(
    "product.template.attribute.value",
    [["product_tmpl_id", "=", template.id]],
    pick(ptavFields, ["id", "name", "attribute_id", "product_attribute_value_id", "price_extra", "ptav_product_variant_ids", "product_variant_ids"]),
    { limit: 200, order: "attribute_id,id" },
  );

  const lines = await searchRead(
    "product.template.attribute.line",
    [["product_tmpl_id", "=", template.id]],
    pick(lineFields, ["id", "attribute_id", "value_ids", "product_template_value_ids", "active"]),
    { limit: 80, order: "id" },
  );

  const suppliers = await searchRead(
    "product.supplierinfo",
    [["product_tmpl_id", "=", template.id]],
    pick(supplierFields, ["id", "partner_id", "product_tmpl_id", "product_id", "price", "currency_id", "min_qty", "delay", "sequence", "product_code", "product_name"]),
    { limit: 80, order: "sequence,id" },
  );

  return { found: true, template, variants, ptavs, attributeLines: lines, suppliers };
}

async function saleLineSamples() {
  const fields = await fieldsGet("sale.order.line");
  const selected = interestingFields("sale.order.line", fields);
  return searchRead("sale.order.line", [["product_id", "!=", false]], selected, { limit: 20, order: "id desc" });
}

async function main() {
  await client.authenticate();
  const modelInspections = [];
  for (const model of MODELS) {
    modelInspections.push(await inspectModel(model));
  }

  const customFields = await studioAndCustomFields();
  const output = {
    auditedAt: new Date().toISOString(),
    url: config.url,
    database: config.database,
    uid: client.uid,
    version: await getVersion(),
    modelCounts: Object.fromEntries(await Promise.all(MODELS.map(async (model) => [model, await count(model)]))),
    installedModules: await installedModules(),
    models: modelInspections,
    customFields,
    viewsUsingCustomFields: Array.isArray(customFields) ? await viewsUsingCustomFields(customFields) : [],
    automations: await automationsAndServerActions(),
    sampleData: await sampleData(),
    productExample: await productExample(),
    saleLineSamples: await saleLineSamples(),
  };

  mkdirSync("logs", { recursive: true });
  const file = join("logs", `odoo-pricing-variants-audit-${config.database}-${stamp()}.json`);
  writeFileSync(file, JSON.stringify(output, null, 2));
  console.log(JSON.stringify({ file, database: output.database, version: output.version, uid: output.uid }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exitCode = 1;
});
