import { requireConfig } from "../src/config.js";
import { OdooApiError, OdooClient } from "../src/odooClient.js";

const client = new OdooClient(requireConfig());

const AUTOMATION_FIELDS = [
  "id",
  "name",
  "active",
  "model_id",
  "trigger",
  "trigger_field_ids",
  "filter_pre_domain",
  "filter_domain",
  "action_server_ids",
  "last_run",
];

const SERVER_ACTION_FIELDS = [
  "id",
  "name",
  "active",
  "model_id",
  "state",
  "usage",
  "code",
  "crud_model_id",
  "link_field_id",
  "fields_lines",
  "child_ids",
];

function available(fields, names) {
  return names.filter((name) => fields[name]);
}

async function readModel(model, preferredFields, domain = []) {
  const fields = await client.fieldsGet(model, []);
  const rows = await client.searchRead(model, domain, available(fields, preferredFields), {
    limit: 200,
    order: "id",
  });
  return { fields, rows };
}

async function modelExists(model) {
  try {
    await client.fieldsGet(model, []);
    return true;
  } catch (error) {
    if (error instanceof OdooApiError) {
      return false;
    }
    throw error;
  }
}

async function main() {
  await client.authenticate();

  const hasBaseAutomation = await modelExists("base.automation");
  const automations = hasBaseAutomation
    ? await readModel("base.automation", AUTOMATION_FIELDS)
    : { fields: {}, rows: [] };
  const serverActions = await readModel("ir.actions.server", SERVER_ACTION_FIELDS);

  const serverActionIds = new Set();
  for (const automation of automations.rows) {
    for (const actionId of automation.action_server_ids || []) {
      serverActionIds.add(actionId);
    }
  }

  const linkedServerActions = serverActions.rows.filter((action) => serverActionIds.has(action.id));
  const standaloneServerActions = serverActions.rows.filter((action) => !serverActionIds.has(action.id));

  console.log(
    JSON.stringify(
      {
        inspectedAt: new Date().toISOString(),
        database: client.database,
        uid: client.uid,
        hasBaseAutomation,
        automationFieldNames: Object.keys(automations.fields).sort(),
        serverActionFieldNames: Object.keys(serverActions.fields).sort(),
        automations: automations.rows,
        linkedServerActions,
        standaloneServerActions,
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
