import { requireConfig } from "../src/config.js";
import { OdooClient } from "../src/odooClient.js";

const client = new OdooClient(requireConfig());

async function main() {
  await client.authenticate();

  const candidateFields = await client.searchRead(
    "ir.model.fields",
    [
      ["model", "in", ["res.partner", "sale.order"]],
      "|",
      "|",
      "|",
      ["name", "ilike", "pagament"],
      ["name", "ilike", "payment"],
      ["field_description", "ilike", "pagament"],
      ["field_description", "ilike", "payment"],
    ],
    ["id", "model", "name", "field_description", "ttype", "relation", "selection", "state"],
    { limit: 100, order: "model,name" },
  );

  const terms = await client.searchRead(
    "account.payment.term",
    [],
    ["id", "name", "active", "company_id", "line_ids"],
    { limit: 100, order: "name" },
  );
  const termLines = await client.searchRead(
    "account.payment.term.line",
    [["payment_id", "in", terms.map((term) => term.id)]],
    ["id", "payment_id", "value", "value_amount", "delay_type", "nb_days", "days_next_month"],
    { limit: 300, order: "payment_id,id" },
  );

  const partnerFields = await client.fieldsGet("res.partner", []);
  const orderFields = await client.fieldsGet("sale.order", []);
  const partnerCandidateNames = candidateFields
    .filter((field) => field.model === "res.partner" && partnerFields[field.name])
    .map((field) => field.name);
  const orderCandidateNames = candidateFields
    .filter((field) => field.model === "sale.order" && orderFields[field.name])
    .map((field) => field.name);

  const partners = await client.searchRead(
    "res.partner",
    ["|", ["property_payment_term_id", "!=", false], ["id", ">", 0]],
    ["id", "name", "active", "customer_rank", "property_payment_term_id", ...partnerCandidateNames],
    { limit: 5000, order: "id" },
  );
  const orders = await client.searchRead(
    "sale.order",
    [],
    ["id", "name", "state", "partner_id", "payment_term_id", ...orderCandidateNames],
    { limit: 5000, order: "id" },
  );

  const automations = await client.searchRead(
    "base.automation",
    [["model_name", "in", ["res.partner", "sale.order"]]],
    ["id", "name", "model_name", "active", "trigger", "action_server_ids"],
    { limit: 200, order: "model_name,name", context: { active_test: false } },
  );
  const actionIds = [...new Set(automations.flatMap((automation) => automation.action_server_ids || []))];
  const actions = actionIds.length
    ? await client.searchRead(
        "ir.actions.server",
        [["id", "in", actionIds]],
        ["id", "name", "model_name", "code"],
        { limit: 300 },
      )
    : [];

  const formViews = await client.searchRead(
    "ir.ui.view",
    [["model", "in", ["res.partner", "sale.order"]], ["type", "=", "form"]],
    ["id", "name", "model", "inherit_id", "priority", "active", "arch_db"],
    { limit: 300, order: "model,priority,id", context: { active_test: false } },
  );
  const paymentViews = formViews.filter((view) => /payment_term|pagament|payment/i.test(view.arch_db || ""));

  const qwebViews = await client.searchRead(
    "ir.ui.view",
    [["type", "=", "qweb"], ["active", "=", true]],
    ["id", "name", "key", "inherit_id", "arch_db"],
    { limit: 1000, order: "id" },
  );
  const saleQweb = qwebViews
    .filter((view) => /sale\.order|payment_term|forma de pagament|forma de pago|payment terms|PORTES|MNL/i.test(`${view.name || ""} ${view.key || ""} ${view.arch_db || ""}`))
    .map((view) => ({
      id: view.id,
      name: view.name,
      key: view.key,
      inherit_id: view.inherit_id,
      paymentExcerpts: (view.arch_db || "")
        .split(/\r?\n/)
        .filter((line) => /payment_term|pagament|forma de pago|payment terms/i.test(line))
        .slice(0, 20),
      arch_db: process.argv.includes("--full-qweb") ? view.arch_db : undefined,
    }));

  const reportActions = await client.searchRead(
    "ir.actions.report",
    [["model", "=", "sale.order"]],
    ["id", "name", "report_name", "report_file", "binding_model_id", "binding_type"],
    { limit: 100, order: "id", context: { active_test: false } },
  );

  const companyFields = await client.fieldsGet("res.company", []);
  const companyPaymentFields = Object.keys(companyFields).filter((name) => /payment.*term|term.*payment/i.test(name));
  const companies = await client.searchRead(
    "res.company",
    [],
    ["id", "name", "partner_id", ...companyPaymentFields],
    { limit: 20 },
  );
  const settingsFields = await client.fieldsGet("res.config.settings", []);
  const settingsPaymentFields = Object.keys(settingsFields).filter((name) => /payment.*term|term.*payment/i.test(name));
  const settings = settingsPaymentFields.length
    ? await client.searchRead("res.config.settings", [], ["id", ...settingsPaymentFields], { limit: 1, order: "id desc" })
    : [];

  function distribution(records, field) {
    const counts = new Map();
    for (const record of records) {
      const raw = record[field];
      const key = Array.isArray(raw) ? `${raw[0]} · ${raw[1]}` : raw || "(buit)";
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1]));
  }

  console.log(
    JSON.stringify(
      {
        inspectedAt: new Date().toISOString(),
        database: client.database,
        candidateFields,
        terms: terms.map((term) => ({ ...term, lines: termLines.filter((line) => line.payment_id?.[0] === term.id) })),
        data: {
          partnerCount: partners.length,
          orderCount: orders.length,
          partnerDistributions: Object.fromEntries(
            ["property_payment_term_id", ...partnerCandidateNames].map((field) => [field, distribution(partners, field)]),
          ),
          orderDistributions: Object.fromEntries(
            ["payment_term_id", ...orderCandidateNames].map((field) => [field, distribution(orders, field)]),
          ),
        },
        automations,
        paymentActions: actions.filter((action) => /payment|pagament|term/i.test(`${action.name || ""} ${action.code || ""}`)),
        paymentViews,
        saleQweb,
        reportActions,
        companyPaymentDefaults: {
          fields: Object.fromEntries(companyPaymentFields.map((name) => [name, companyFields[name]])),
          companies,
          settingsFields: Object.fromEntries(settingsPaymentFields.map((name) => [name, settingsFields[name]])),
          settings,
        },
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
