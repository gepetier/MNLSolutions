import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { requireConfig } from "../src/config.js";
import { OdooClient } from "../src/odooClient.js";

const client = new OdooClient(requireConfig());
const orderId = Number(process.argv[2]);

if (!orderId) {
  throw new Error("Us: node scripts/test_odoo_quote_template_actions.js <sale.order id>");
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function main() {
  await client.authenticate();
  const reports = await client.searchRead(
    "ir.actions.report",
    [["report_name", "ilike", "mnl_solutions.report_saleorder_style_"]],
    ["id", "name", "report_name", "report_type", "binding_model_id", "binding_type"],
    { order: "report_name" },
  );

  const checks = [];
  for (const report of reports) {
    try {
      const action = await client.call("ir.actions.report", "report_action", [[report.id], [orderId]]);
      checks.push({
        reportId: report.id,
        name: report.name,
        reportName: report.report_name,
        ok: action?.type === "ir.actions.report" && action?.report_name === report.report_name,
        action,
      });
    } catch (error) {
      checks.push({ reportId: report.id, name: report.name, reportName: report.report_name, ok: false, error: error.message });
    }
  }

  const summary = {
    database: client.database,
    orderId,
    checkedAt: new Date().toISOString(),
    reports,
    checks,
  };

  mkdirSync("logs", { recursive: true });
  const file = join("logs", `odoo-quote-template-action-test-${client.database}-${stamp()}.json`);
  writeFileSync(file, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ file, ok: checks.every((check) => check.ok), reports: reports.length, checks }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exitCode = 1;
});
