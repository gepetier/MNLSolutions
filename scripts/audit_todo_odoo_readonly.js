import { OdooClient } from "../src/odooClient.js";
import { requireConfig } from "../src/config.js";

const config = requireConfig();
const client = new OdooClient(config);

async function safe(label, operation, fallback = null) {
  try {
    return await operation();
  } catch (error) {
    return { error: `${label}: ${error.message}` } || fallback;
  }
}

async function fields(model) {
  return safe(`fields_get ${model}`, () => client.fieldsGet(model, []), {});
}

function fieldSummary(definitions, predicate = () => true) {
  if (!definitions || definitions.error) return definitions;
  return Object.entries(definitions)
    .filter(([name, definition]) => predicate(name, definition))
    .map(([name, definition]) => ({
      name,
      label: definition.string,
      type: definition.type,
      required: Boolean(definition.required),
      readonly: Boolean(definition.readonly),
      selection: definition.selection || undefined,
    }));
}

async function count(model, domain = []) {
  return safe(`search_count ${model}`, () => client.call(model, "search_count", [domain]));
}

async function rows(model, domain, wantedFields, options = {}) {
  const definitions = await fields(model);
  if (definitions.error) return definitions;
  const available = wantedFields.filter((field) => definitions[field]);
  return safe(`search_read ${model}`, () => client.searchRead(model, domain, available, options), []);
}

await client.authenticate();

const [partnerFields, orderFields, lineFields, productFields, templateFields, automationFields, actionFields] = await Promise.all([
  fields("res.partner"),
  fields("sale.order"),
  fields("sale.order.line"),
  fields("product.product"),
  fields("product.template"),
  fields("base.automation"),
  fields("ir.actions.server"),
]);

const customFieldPredicate = (name, definition) =>
  name.startsWith("x_studio_") ||
  /contact|client|customer|bloque|block|estat|estado|status|famil|marge|margin|cost|prove|supplier|valid|idioma|language/i.test(
    `${name} ${definition.string || ""}`,
  );

const automationWanted = ["id", "name", "active", "trigger", "model_id", "action_server_ids", "last_run"];
const actionWanted = ["id", "name", "model_id", "state", "usage", "code", "binding_model_id"];

const output = {
  auditedAt: new Date().toISOString(),
  database: config.database,
  mode: "read-only",
  counts: {
    productTemplates: await count("product.template"),
    productVariants: await count("product.product"),
    partners: await count("res.partner"),
    saleOrders: await count("sale.order"),
    supplierInfo: await count("product.supplierinfo"),
    pricelists: await count("product.pricelist"),
    pricelistItems: await count("product.pricelist.item"),
  },
  modules: await rows(
    "ir.module.module",
    [["name", "in", ["product", "sale", "sale_management", "purchase", "sale_purchase", "account", "web_studio", "studio_customization", "sale_pdf_quote_builder", "stock", "stock_account", "sale_margin", "product_matrix", "sale_product_matrix"]]],
    ["name", "state", "installed_version"],
    { limit: 100 },
  ),
  customFields: {
    partner: fieldSummary(partnerFields, customFieldPredicate),
    saleOrder: fieldSummary(orderFields, customFieldPredicate),
    saleOrderLine: fieldSummary(lineFields, customFieldPredicate),
    product: fieldSummary(productFields, customFieldPredicate),
    productTemplate: fieldSummary(templateFields, customFieldPredicate),
  },
  categories: await rows("product.category", [["complete_name", "ilike", "Panell"]], ["id", "name", "complete_name", "parent_id"], { limit: 100 }),
  attributes: await rows("product.attribute", [["name", "in", ["Gruix", "Chapa", "Recobriment"]]], ["id", "name", "create_variant"], { limit: 20 }),
  units: await rows("uom.uom", [["name", "ilike", "m"]], ["id", "name", "category_id", "uom_type", "factor"], { limit: 100 }),
  mnlTemplates: await rows(
    "product.template",
    [],
    ["id", "name", "default_code", "categ_id", "uom_id", "product_variant_count", "active", "description_sale", "seller_ids", "list_price", "standard_price"],
    { limit: 100, order: "id" },
  ),
  quoteReports: await rows(
    "ir.actions.report",
    [["report_name", "ilike", "mnl_solutions"]],
    ["id", "name", "model", "report_name", "report_type", "binding_model_id", "binding_type"],
    { limit: 100 },
  ),
  quoteViews: await rows(
    "ir.ui.view",
    [["key", "ilike", "mnl_solutions"]],
    ["id", "name", "key", "model", "type", "active", "arch_db"],
    { limit: 100 },
  ),
  mnlAutomations: await rows(
    "base.automation",
    ["|", ["name", "ilike", "MNL"], ["name", "in", ["Calcular cantidad y total línea", "Copiar cantidad inicial a UDS", "Assignar classificador línia", "Ordenar líneas por clasificador"]]],
    automationWanted.filter((field) => automationFields[field]),
    { limit: 100 },
  ),
  mnlServerActions: await rows(
    "ir.actions.server",
    ["|", ["name", "ilike", "MNL"], ["name", "ilike", "classificador"]],
    actionWanted.filter((field) => actionFields[field]),
    { limit: 100 },
  ),
};

if (process.env.TODO_AUDIT_SUMMARY === "1") {
  const viewRows = Array.isArray(output.quoteViews) ? output.quoteViews : [];
  const automationRows = Array.isArray(output.mnlAutomations) ? output.mnlAutomations : [];
  const actionRows = Array.isArray(output.mnlServerActions) ? output.mnlServerActions : [];
  const templateRows = Array.isArray(output.mnlTemplates) ? output.mnlTemplates : [];
  const summary = {
    auditedAt: output.auditedAt,
    database: output.database,
    mode: output.mode,
    counts: output.counts,
    modules: Array.isArray(output.modules)
      ? output.modules.map(({ name, state, installed_version }) => ({ name, state, installed_version }))
      : output.modules,
    customFields: Object.fromEntries(
      Object.entries(output.customFields).map(([model, definitions]) => [
        model,
        Array.isArray(definitions)
          ? definitions.filter((field) => field.name.startsWith("x_studio_")).map((field) => ({
              name: field.name,
              label: field.label,
              type: field.type,
              required: field.required,
              selection: field.selection,
            }))
          : definitions,
      ]),
    ),
    categories: output.categories,
    attributes: output.attributes,
    units: output.units,
    productTemplates: {
      codedCount: templateRows.length,
      mnlCount: templateRows.filter((row) => String(row.default_code || "").startsWith("HI-") || String(row.default_code || "").startsWith("TZ-")).length,
      variantTotal: templateRows.reduce((sum, row) => sum + Number(row.product_variant_count || 0), 0),
      rows: templateRows.map((row) => ({
        id: row.id,
        name: row.name,
        default_code: row.default_code,
        category: row.categ_id,
        unit: row.uom_id,
        variants: row.product_variant_count,
        hasDescription: Boolean(row.description_sale),
        supplierCount: Array.isArray(row.seller_ids) ? row.seller_ids.length : null,
      })),
    },
    reports: Array.isArray(output.quoteReports)
      ? output.quoteReports.map(({ id, name, model, report_name, report_type, binding_model_id, binding_type }) => ({
          id,
          name,
          model,
          report_name,
          report_type,
          binding_model_id,
          binding_type,
        }))
      : output.quoteReports,
    views: viewRows.map((row) => {
      const xml = String(row.arch_db || "");
      return {
        id: row.id,
        name: row.name,
        key: row.key,
        active: row.active,
        hasEnvio: /ENVIO|partner_shipping_id|adreca_obra/i.test(xml),
        hasClientContact: /contacte_pressupost|contact/i.test(xml),
        hasMultilanguage: /mnl_lang|idioma_document|CLIENTE|CUSTOMER/i.test(xml),
        hasDimensions: /x_studio_uds|x_studio_long|x_studio_ancho_1/i.test(xml),
        hasClassifier: /x_studio_classificador/i.test(xml),
        hasPaymentTerms: /payment_term|FORMA DE PAGO|forma de pagament/i.test(xml),
        hasBankData: /bank|banc|IBAN|CAIXA/i.test(xml),
        hasAcceptance: /accept|signatura|firma/i.test(xml),
        hasInduspanel: /induspanel/i.test(xml),
        hasPorts: /PORTES|transport/i.test(xml),
        hasDiscount: /discount|descomp/i.test(xml),
      };
    }),
    automations: automationRows.map((row) => ({
      id: row.id,
      name: row.name,
      active: row.active,
      trigger: row.trigger,
      action_server_ids: row.action_server_ids,
      last_run: row.last_run,
    })),
    serverActions: actionRows.map((row) => {
      const code = String(row.code || "");
      return {
        id: row.id,
        name: row.name,
        usage: row.usage,
        binding_model_id: row.binding_model_id,
        writesCostMarginSupplier: /x_studio_(cost_unitari|marge_|proveidor)/.test(code),
        writesDeliveryAddress: /x_studio_adreca_obra_id/.test(code),
        handlesM2: /calculation_type == ['\"]m2['\"]|uds \* longitud \* ancho/.test(code),
        handlesMl: /calculation_type == ['\"]ml['\"]|uds \* longitud/.test(code),
        handlesUnits: /total = uds/.test(code),
        blocksCustomers: /estat_comercial.*bloquejat/.test(code),
      };
    }),
  };
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(JSON.stringify(output, null, 2));
}
