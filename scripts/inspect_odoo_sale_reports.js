import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { requireConfig } from "../src/config.js";
import { OdooClient } from "../src/odooClient.js";

const client = new OdooClient(requireConfig());

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function safeFields(model) {
  try {
    return await client.fieldsGet(model, []);
  } catch {
    return {};
  }
}

function pick(fields, names) {
  return names.filter((name) => fields[name]);
}

async function main() {
  await client.authenticate();

  const reportFields = await safeFields("ir.actions.report");
  const viewFields = await safeFields("ir.ui.view");
  const dataFields = await safeFields("ir.model.data");

  const reports = await client.searchRead(
    "ir.actions.report",
    [["model", "=", "sale.order"]],
    pick(reportFields, [
      "id",
      "name",
      "model",
      "report_name",
      "report_file",
      "report_type",
      "paperformat_id",
      "binding_model_id",
      "binding_type",
      "print_report_name",
    ]),
    { limit: 80, order: "id" },
  );

  const reportNames = reports.flatMap((report) => [report.report_name, report.report_file]).filter(Boolean);
  const views = await client.searchRead(
    "ir.ui.view",
    [
      "|",
      ["key", "in", reportNames],
      "|",
      ["name", "ilike", "sale"],
      ["arch_db", "ilike", "sale.report_saleorder"],
    ],
    pick(viewFields, ["id", "name", "type", "key", "model", "inherit_id", "priority", "active", "arch_db"]),
    { limit: 80, order: "id" },
  );

  const xmlIds = await client.searchRead(
    "ir.model.data",
    [
      ["model", "in", ["ir.ui.view", "ir.actions.report"]],
      ["res_id", "in", [...reports.map((r) => r.id), ...views.map((v) => v.id)]],
    ],
    pick(dataFields, ["id", "module", "name", "model", "res_id", "complete_name"]),
    { limit: 200, order: "module,name" },
  );

  const payload = {
    inspectedAt: new Date().toISOString(),
    database: client.database,
    reports,
    views: views.map((view) => ({
      ...view,
      arch_db: view.arch_db ? view.arch_db.slice(0, 3000) : view.arch_db,
    })),
    xmlIds,
  };

  mkdirSync("logs", { recursive: true });
  const file = join("logs", `odoo-sale-reports-${client.database}-${stamp()}.json`);
  writeFileSync(file, JSON.stringify(payload, null, 2));
  console.log(JSON.stringify({ file, reports: reports.length, views: views.length, xmlIds: xmlIds.length }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  if (error.body) {
    console.error(JSON.stringify(error.body, null, 2));
  }
  process.exitCode = 1;
});
