import { requireConfig } from "../src/config.js";
import { OdooClient } from "../src/odooClient.js";

const client = new OdooClient(requireConfig());
const names = process.argv.slice(2);
await client.authenticate();
const automations = await client.searchRead(
  "base.automation",
  [["name", "in", names]],
  ["id", "name", "trigger", "trigger_field_ids", "action_server_ids"],
  { limit: names.length + 5 },
);
const actionIds = automations.flatMap((row) => row.action_server_ids);
const actions = await client.searchRead(
  "ir.actions.server",
  [["id", "in", actionIds]],
  ["id", "name", "code"],
  { limit: actionIds.length + 5 },
);
console.log(JSON.stringify({ automations, actions }, null, 2));
