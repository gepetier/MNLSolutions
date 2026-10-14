import { requireConfig } from "../src/config.js";
import { OdooClient } from "../src/odooClient.js";

const client = new OdooClient(requireConfig());

function selectFields(spec, names) {
  return names.filter((name) => spec[name]);
}

async function inspectModel(model, preferredFields = []) {
  try {
    const fields = await client.fieldsGet(model, []);
    return {
      exists: true,
      fields: Object.fromEntries(
        selectFields(fields, preferredFields).map((name) => [
          name,
          {
            type: fields[name].type,
            string: fields[name].string,
            relation: fields[name].relation,
            selection: fields[name].selection,
          },
        ]),
      ),
    };
  } catch (error) {
    return { exists: false, error: error.message };
  }
}

async function main() {
  await client.authenticate();

  const models = {};
  models.saleOrder = await inspectModel("sale.order", [
    "order_line",
    "validity_date",
    "company_id",
    "currency_id",
    "tax_country_id",
  ]);
  models.saleOrderLine = await inspectModel("sale.order.line", [
    "order_id",
    "name",
    "product_id",
    "price_unit",
    "discount",
    "tax_id",
    "tax_ids",
    "purchase_price",
    "margin",
  ]);
  models.discountWizard = await inspectModel("sale.order.discount", [
    "sale_order_id",
    "discount_type",
    "discount_percentage",
    "discount_amount",
  ]);
  models.settings = await inspectModel("res.config.settings", [
    "use_quotation_validity_days",
    "quotation_validity_days",
  ]);

  const discountViews = await client.searchRead(
    "ir.ui.view",
    [["model", "=", "sale.order.discount"]],
    ["id", "name", "type", "arch_db", "inherit_id", "active"],
    { limit: 20, order: "priority,id" },
  );
  const saleViews = await client.searchRead(
    "ir.ui.view",
    [["model", "=", "sale.order"], ["type", "=", "form"]],
    ["id", "name", "inherit_id", "priority", "active", "arch_db"],
    { limit: 80, order: "priority,id" },
  );
  const taxes = await client.searchRead(
    "account.tax",
    [["type_tax_use", "=", "sale"], ["active", "=", true]],
    ["id", "name", "amount_type", "amount", "price_include", "company_id"],
    { limit: 80, order: "company_id,name" },
  );
  const settings = await client.searchRead(
    "res.config.settings",
    [],
    selectFields(
      await client.fieldsGet("res.config.settings", []),
      ["use_quotation_validity_days", "quotation_validity_days"],
    ),
    { limit: 1, order: "id desc" },
  );
  const transportProducts = await client.searchRead(
    "product.product",
    ["|", ["name", "ilike", "Portes"], ["name", "ilike", "Transport"]],
    ["id", "name", "default_code", "list_price", "sale_ok", "purchase_ok", "taxes_id"],
    { limit: 30, order: "name" },
  );
  const transportFields = await client.searchRead(
    "ir.model.fields",
    [["name", "ilike", "mnl_portes"]],
    ["id", "model", "name", "field_description", "ttype", "relation"],
    { limit: 100, order: "model,name" },
  );
  const candidatePartners = await client.searchRead(
    "res.partner",
    ["|", ["name", "ilike", "Huurre"], ["name", "ilike", "Borrell"]],
    ["id", "name", "supplier_rank", "customer_rank", "active"],
    { limit: 30, order: "name" },
  );
  const configurationMenus = await client.searchRead(
    "ir.ui.menu",
    [["name", "in", ["Sales", "Configuration", "Configuració", "Vendes"]]],
    ["id", "name", "parent_id", "complete_name", "action", "sequence"],
    { limit: 80, order: "id" },
  );
  const validityAutomations = await client.searchRead(
    "base.automation",
    [["model_name", "=", "sale.order"]],
    ["id", "name", "active", "trigger", "action_server_ids"],
    { limit: 100, order: "name" },
  );
  const validityActions = await client.searchRead(
    "ir.actions.server",
    [["model_name", "=", "sale.order"], "|", ["name", "ilike", "valid"], ["code", "ilike", "valid"]],
    ["id", "name", "code", "model_id"],
    { limit: 100, order: "name" },
  );
  let defaultValidityDays = null;
  try {
    defaultValidityDays = await client.call("ir.config_parameter", "get_param", [
      "sale.default_quotation_validity_days",
    ]);
  } catch (error) {
    defaultValidityDays = { error: error.message };
  }

  const result = {
        inspectedAt: new Date().toISOString(),
        database: client.database,
        models,
        settings,
        taxes,
        transportProducts,
        transportFields,
        candidatePartners,
        configurationMenus,
        validity: {
          defaultValidityDays,
          automations: validityAutomations,
          actions: validityActions,
        },
        discountViews,
        saleViews: saleViews
          .filter((view) => /discount|descompte|order_line|validity|validesa/i.test(view.arch_db || ""))
          .map((view) => ({
            id: view.id,
            name: view.name,
            inherit_id: view.inherit_id,
            priority: view.priority,
            active: view.active,
            arch_db: view.arch_db,
          })),
      };
  if (process.argv.includes("--summary")) {
    console.log(
      JSON.stringify(
        {
          inspectedAt: result.inspectedAt,
          database: result.database,
          models: result.models,
          taxCount: result.taxes.length,
          salesTaxes21: result.taxes.filter((tax) => tax.amount === 21 && tax.amount_type === "percent"),
          transportProducts: result.transportProducts,
          transportFields: result.transportFields,
          candidatePartners: result.candidatePartners,
          configurationMenus: result.configurationMenus,
          validity: result.validity,
          discountViews: result.discountViews,
        },
        null,
        2,
      ),
    );
    return;
  }
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exitCode = 1;
});
