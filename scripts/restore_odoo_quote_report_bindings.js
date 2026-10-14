import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { requireConfig } from "../src/config.js";
import { OdooClient } from "../src/odooClient.js";

const client = new OdooClient(requireConfig());

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function main() {
  await client.authenticate();
  if (!process.argv.includes("--apply")) {
    throw new Error("Operació d'escriptura: torna a executar amb --apply i ODOO_ENV_FILE=112.env.");
  }
  const productionApply = process.argv.includes("--production") && client.database === "mnl-technical-consultant";
  const testApply = process.argv.includes("--test") && /^provesmnl\d+$/.test(client.database);
  if (!productionApply && !testApply) {
    throw new Error(`Indica --test per a una base provesmnl o --production per a mnl-technical-consultant; base actual: ${client.database}.`);
  }

  const [saleOrderModel] = await client.searchRead("ir.model", [["model", "=", "sale.order"]], ["id"], { limit: 1 });
  if (!saleOrderModel) throw new Error("No trobo el model sale.order.");
  const reports = await client.searchRead(
    "ir.actions.report",
    [["report_name", "ilike", "mnl_solutions.report_saleorder_style_"]],
    ["id", "name", "model", "report_name", "report_file", "report_type", "binding_model_id", "binding_type"],
    { limit: 20, order: "report_name", context: { active_test: false } },
  );
  if (reports.length !== 4) throw new Error(`S'esperaven 4 informes MNL i se n'han trobat ${reports.length}.`);

  mkdirSync("logs", { recursive: true });
  const backupFile = join("logs", `odoo-quote-report-bindings-backup-${client.database}-${stamp()}.json`);
  writeFileSync(backupFile, JSON.stringify({ database: client.database, backedUpAt: new Date().toISOString(), reports }, null, 2));

  for (const report of reports) {
    await client.write("ir.actions.report", [report.id], {
      model: "sale.order",
      report_file: report.report_name,
      report_type: "qweb-pdf",
      binding_model_id: saleOrderModel.id,
      binding_type: "report",
    });
  }
  const restored = await client.searchRead(
    "ir.actions.report",
    [["id", "in", reports.map((report) => report.id)]],
    ["id", "name", "model", "report_name", "report_file", "report_type", "binding_model_id", "binding_type"],
    { limit: 20, order: "report_name" },
  );
  const valid = restored.every((report) => report.binding_model_id?.[0] === saleOrderModel.id && report.report_type === "qweb-pdf");
  if (!valid) throw new Error("No tots els informes han quedat vinculats correctament a sale.order.");
  const logFile = join("logs", `odoo-quote-report-bindings-install-${client.database}-${stamp()}.json`);
  writeFileSync(logFile, JSON.stringify({ database: client.database, backupFile, restored }, null, 2));
  console.log(JSON.stringify({ database: client.database, backupFile, logFile, restored }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exitCode = 1;
});
