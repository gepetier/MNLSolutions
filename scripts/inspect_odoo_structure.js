import { requireConfig } from "../src/config.js";
import { OdooClient } from "../src/odooClient.js";

const MODELS = [
  "product.template",
  "product.product",
  "product.attribute",
  "product.attribute.value",
  "product.template.attribute.line",
  "product.template.attribute.value",
  "product.category",
  "uom.uom",
  "res.partner",
  "sale.order",
  "sale.order.line",
  "ir.ui.view",
];

const VIEW_MODELS = ["product.template", "product.product", "res.partner", "sale.order", "sale.order.line"];

const client = new OdooClient(requireConfig());

function pickFields(fields, preferred) {
  return preferred.filter((field) => fields[field]);
}

async function count(model, domain = []) {
  return client.call(model, "search_count", [domain]);
}

async function safeSearchRead(model, domain, preferredFields, kwargs = {}) {
  const fields = await client.fieldsGet(model, []);
  return client.searchRead(model, domain, pickFields(fields, preferredFields), kwargs);
}

async function inspectModelFields(model) {
  const fields = await client.fieldsGet(model, []);
  const interesting = Object.entries(fields)
    .filter(([name]) =>
      [
        "name",
        "default_code",
        "list_price",
        "lst_price",
        "standard_price",
        "categ_id",
        "attribute_line_ids",
        "product_variant_ids",
        "product_template_variant_value_ids",
        "product_template_attribute_value_ids",
        "price_extra",
        "sale_ok",
        "purchase_ok",
        "detailed_type",
        "type",
        "uom_id",
        "uom_po_id",
        "partner_id",
        "order_line",
        "product_id",
        "product_uom_qty",
        "price_unit",
        "tax_id",
        "email",
        "phone",
        "mobile",
        "vat",
        "street",
        "street2",
        "zip",
        "city",
      ].includes(name),
    )
    .map(([name, spec]) => ({ name, type: spec.type, label: spec.string, selection: spec.selection || undefined }));
  return { model, fieldCount: Object.keys(fields).length, interesting };
}

async function main() {
  await client.authenticate();

  const modelFields = [];
  for (const model of MODELS) {
    modelFields.push(await inspectModelFields(model));
  }

  const views = await safeSearchRead(
    "ir.ui.view",
    [["model", "in", VIEW_MODELS]],
    ["id", "name", "model", "type", "active", "inherit_id", "priority", "key"],
    { limit: 80, order: "model,type,priority,id" },
  );

  const templates = await safeSearchRead(
    "product.template",
    [["default_code", "!=", false]],
    ["id", "name", "default_code", "categ_id", "list_price", "sale_ok", "purchase_ok", "detailed_type", "type", "attribute_line_ids", "product_variant_count"],
    { limit: 80, order: "default_code" },
  );

  const attributes = await safeSearchRead(
    "product.attribute",
    [],
    ["id", "name", "display_type", "create_variant", "value_ids"],
    { limit: 80, order: "name" },
  );

  const categories = await safeSearchRead(
    "product.category",
    [["name", "in", ["Panells", "Coberta", "Facana"]]],
    ["id", "name", "parent_id", "complete_name"],
    { limit: 20, order: "name" },
  );

  const panelCategoryIds = categories.map((category) => category.id);
  const panelTemplates = panelCategoryIds.length
    ? await safeSearchRead(
        "product.template",
        [["categ_id", "in", panelCategoryIds]],
        ["id", "name", "default_code", "categ_id", "list_price", "sale_ok", "purchase_ok", "detailed_type", "type", "attribute_line_ids", "product_variant_count"],
        { limit: 80, order: "name" },
      )
    : [];

  const uoms = await safeSearchRead(
    "uom.uom",
    [["name", "ilike", "m"]],
    ["id", "name", "category_id", "uom_type", "factor", "rounding"],
    { limit: 30, order: "name" },
  );

  const counts = {};
  for (const model of ["product.template", "product.product", "res.partner", "sale.order", "ir.ui.view"]) {
    counts[model] = await count(model);
  }

  console.log(
    JSON.stringify(
      {
        inspectedAt: new Date().toISOString(),
        uid: client.uid,
        database: client.database,
        counts,
        modelFields,
        views,
        productTemplatesWithDefaultCode: templates,
        panelProductTemplates: panelTemplates,
        attributes,
        panelCategories: categories,
        candidateUoms: uoms,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error.message);
  if (error.body) {
    console.error(JSON.stringify(error.body, null, 2));
  }
  process.exitCode = 1;
});
