import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { requireConfig } from "../src/config.js";
import { OdooClient } from "../src/odooClient.js";

const config = requireConfig();
config.url = new URL(config.url).origin;
if (!process.env.ODOO_ENV_FILE || !/^provesmnl\d+$/.test(config.database)) throw new Error("Selecciona explícitament la base de proves.");
const client = new OdooClient({ ...config, fetchImpl: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(30000) }) });
const ACTION_NAME = "MNL - UI reservar numero en nou pressupost";
const AUTOMATION_NAME = "MNL - Reservar numero en carregar nou pressupost";

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

const ACTION_CODE = `
values_to_return = {}
for record in (record and [record]) or records or []:
    current_name = (record.name or '').strip()
    current_reference = (record.x_studio_referencia or '').strip()
    is_new = not current_name or current_name.lower() in ['new', 'nou', 'nuevo']
    if is_new and not current_reference:
        reference = env['ir.sequence'].next_by_code('sale.order') or ''
        if reference:
            values_to_return.update({
                'name': '%s-A' % reference,
                'x_studio_referencia': reference,
                'x_studio_revisio': 'A',
            })
action = {'value': values_to_return}
`;

async function modelId() {
  const [model] = await client.searchRead("ir.model", [["model", "=", "sale.order"]], ["id"], { limit: 1 });
  if (!model) throw new Error("No trobo el model sale.order.");
  return model.id;
}

async function backup(saleOrderModelId) {
  const actions = await client.searchRead("ir.actions.server", [["name", "=", ACTION_NAME], ["model_id", "=", saleOrderModelId]], ["id", "name", "code"], { limit: 5 });
  const automations = await client.searchRead("base.automation", [["name", "=", AUTOMATION_NAME], ["model_id", "=", saleOrderModelId]], ["id", "name", "active", "trigger", "on_change_field_ids", "trigger_field_ids", "action_server_ids"], { limit: 5 });
  mkdirSync("logs", { recursive: true });
  const file = join("logs", `odoo-quote-number-on-load-backup-${client.database}-${stamp()}.json`);
  writeFileSync(file, JSON.stringify({ database: client.database, backedUpAt: new Date().toISOString(), actions, automations }, null, 2));
  return file;
}

async function upsertAction(saleOrderModelId) {
  const [existing] = await client.searchRead("ir.actions.server", [["name", "=", ACTION_NAME], ["model_id", "=", saleOrderModelId]], ["id"], { limit: 1 });
  const values = { name: ACTION_NAME, model_id: saleOrderModelId, state: "code", code: ACTION_CODE };
  if (existing) {
    await client.write("ir.actions.server", [existing.id], values);
    return existing.id;
  }
  return client.create("ir.actions.server", values);
}

async function upsertAutomation(saleOrderModelId, actionId) {
  const triggers = await client.searchRead("ir.model.fields", [["model", "=", "sale.order"], ["name", "in", ["name", "company_id"]]], ["id", "name"]);
  if (triggers.length !== 2) throw new Error("Falten els camps de càrrega inicial.");
  const [existing] = await client.searchRead("base.automation", [["name", "=", AUTOMATION_NAME], ["model_id", "=", saleOrderModelId]], ["id"], { limit: 1 });
  const values = {
    name: AUTOMATION_NAME,
    model_id: saleOrderModelId,
    active: true,
    trigger: "on_change",
    on_change_field_ids: [[6, 0, triggers.map(field => field.id)]],
    trigger_field_ids: [[6, 0, []]],
    action_server_ids: [[6, 0, [actionId]]],
  };
  if (existing) {
    await client.write("base.automation", [existing.id], values);
    return existing.id;
  }
  return client.create("base.automation", values);
}

async function main() {
  await client.authenticate();
  const saleOrderModelId = await modelId();
  const backupFile = await backup(saleOrderModelId);
  const actionId = await upsertAction(saleOrderModelId);
  const automationId = await upsertAutomation(saleOrderModelId, actionId);
  const [sequence] = await client.searchRead("ir.sequence", [["code", "=", "sale.order"]], ["id", "number_next_actual", "prefix", "padding"], { limit: 1 });
  const result = { database: client.database, backupFile, actionId, automationId, sequence };
  const logFile = join("logs", `odoo-quote-number-on-load-install-${client.database}-${stamp()}.json`);
  writeFileSync(logFile, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ ...result, logFile }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exitCode = 1;
});
