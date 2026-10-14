import { requireConfig } from "../src/config.js";
import { OdooClient } from "../src/odooClient.js";

const client = new OdooClient(requireConfig());
if (client.database !== "provesmnl202609") throw new Error(`Base inesperada: ${client.database}`);

const terms = await client.searchRead(
  "account.payment.term",
  [],
  ["id", "name", "active", "line_ids", "company_id"],
  { limit: 100, order: "id", context: { active_test: false } },
);
const termNamesByLanguage = {};
for (const language of ["en_US", "es_ES", "ca_ES"]) {
  termNamesByLanguage[language] = await client.searchRead(
    "account.payment.term",
    [["id", "in", [1, 2, 3]]],
    ["id", "name"],
    { limit: 3, order: "id", context: { lang: language } },
  );
}
const products = await client.searchRead(
  "product.product",
  [["id", "in", [48, 5762]]],
  ["id", "name", "default_code", "categ_id"],
  { limit: 2 },
);
const termLines = await client.searchRead(
  "account.payment.term.line",
  [["id", "in", terms.flatMap((term) => term.line_ids)]],
  ["id", "payment_id", "value", "value_amount", "delay_type", "nb_days"],
  { limit: 100 },
);
const termUses = [];
for (const term of terms) {
  termUses.push({
    id: term.id,
    partners: await client.call("res.partner", "search_count", [[["property_payment_term_id", "=", term.id]]]),
    orders: await client.call("sale.order", "search_count", [[["payment_term_id", "=", term.id]]]),
  });
}

const models = await client.searchRead(
  "ir.model",
  [["model", "in", ["sale.order", "sale.order.line"]]],
  ["id", "model"],
  { limit: 5 },
);
const automations = await client.searchRead(
  "base.automation",
  [["model_id", "in", models.map((model) => model.id)]],
  ["id", "name", "active", "model_id", "trigger", "trigger_field_ids", "action_server_ids"],
  { limit: 100, order: "id", context: { active_test: false } },
);
const actions = await client.searchRead(
  "ir.actions.server",
  [["id", "in", [...new Set(automations.flatMap((automation) => automation.action_server_ids || []))]]],
  ["id", "name", "state", "code"],
  { limit: 100, order: "id" },
);
const [order] = await client.searchRead(
  "sale.order",
  [["id", "=", 20]],
  ["id", "name", "payment_term_id", "order_line", "amount_total"],
  { limit: 1 },
);
const orderLines = order ? await client.searchRead(
  "sale.order.line",
  [["id", "in", order.order_line]],
  ["id", "name", "display_type", "sequence", "x_studio_classificador", "x_studio_familia", "product_id", "product_uom_qty"],
  { limit: 100, order: "sequence,id" },
) : [];
const allSections = await client.searchRead(
  "sale.order.line",
  [["display_type", "=", "line_section"]],
  ["id", "order_id", "name", "sequence"],
  { limit: 1000, order: "order_id,sequence,id" },
);

const report = {
  database: client.database,
  terms,
  termNamesByLanguage,
  products,
  termLines,
  termUses,
  automations,
  actions,
  order,
  orderLines,
  allSections,
};
console.log(JSON.stringify(process.env.RESTART_SUMMARY === "1" ? {
  database: report.database,
  termNamesByLanguage,
  products,
  sectionAction: actions.find((action) => action.id === 822),
  orderLines,
  allSections,
} : report, null, 2));
