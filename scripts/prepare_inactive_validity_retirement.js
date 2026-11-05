/**
 * Read-only preparation of inactive-action retirement on the reference test DB.
 * Never writes to Odoo. Requires explicit ODOO_ENV_FILE and a private output path.
 * Runtime / Odoo validation must be completed before using its generated proposal.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { requireConfig } from "../src/config.js";
import { OdooClient } from "../src/odooClient.js";

const DB = "provesmnl1410";
const IDS = [820, 821];
const RETIRED = "# Retired inactive validity action; original preserved in private rollback.";
const hash = (value) => createHash("sha256").update(value).digest("hex");

async function all(client, model, fields, domain = []) {
  const rows = [];
  for (let offset = 0; ; offset += 200) {
    const page = await client.searchRead(model, domain, fields, {
      limit: 200, offset, order: "id", context: { active_test: false },
    });
    rows.push(...page);
    if (page.length < 200) return rows;
  }
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length !== 2 || argv[0] !== "--output" || !isAbsolute(argv[1])) {
    throw new Error("Use --output /absolute/private/proposal.json. This tool only prepares a proposal.");
  }
  if (!process.env.ODOO_ENV_FILE) throw new Error("Select an explicit ODOO_ENV_FILE.");
  const output = resolve(argv[1]);
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const rel = relative(repoRoot, output);
  if (!rel.startsWith("..") && !isAbsolute(rel)) {
    throw new Error("Private originals must be saved outside the repository.");
  }
  const config = requireConfig();
  if (config.database !== DB || new URL(config.url).origin !== "https://" + DB + ".odoo.com") {
    throw new Error("Only the explicitly selected reference test database is accepted.");
  }
  const client = new OdooClient(config);
  await client.authenticate();
  // An absent flag is not evidence of neutralization. Fail closed.
  const flags = await client.searchRead("ir.config_parameter",
    [["key", "=", "database.is_neutralized"]], ["key", "value"]);
  const neutralized = flags.some((row) => ["true", "1"].includes(String(row.value).toLowerCase()));
  if (!neutralized) throw new Error("Neutralization could not be verified. No proposal generated.");

  const actions = await all(client, "ir.actions.server",
    ["id", "name", "model_id", "state", "code", "base_automation_id", "binding_model_id", "child_ids", "write_date"]);
  const automations = await all(client, "base.automation",
    ["id", "name", "active", "action_server_ids", "trigger", "filter_domain", "filter_pre_domain", "write_date"]);
  const views = await all(client, "ir.ui.view", ["id", "name", "arch_db", "active"]);
  const proposals = [];
  for (const id of IDS) {
    const action = actions.find((row) => row.id === id);
    if (!action || action.state !== "code" || typeof action.code !== "string") {
      throw new Error("Expected Python action is missing or changed: " + id);
    }
    const linked = automations.filter((row) => row.action_server_ids.includes(id));
    const ownerId = Array.isArray(action.base_automation_id) ? action.base_automation_id[0] : action.base_automation_id;
    if (!linked.length || !linked.some((row) => row.id === ownerId) || linked.some((row) => row.active)) {
      throw new Error("Action must belong exclusively to verified inactive automations: " + id);
    }
    if (action.binding_model_id) throw new Error("Action has a direct menu binding: " + id);
    const literal = new RegExp("\\b" + id + "\\b");
    const references = [
      ...actions.filter((row) => row.id !== id && (
        row.child_ids.includes(id) || literal.test(row.code || "")
      )).map((row) => ({ model: "ir.actions.server", id: row.id, name: row.name })),
      ...views.filter((row) => literal.test(String(row.arch_db || "")))
        .map((row) => ({ model: "ir.ui.view", id: row.id, name: row.name })),
    ];
    proposals.push({
      id, name: action.name, blocked: references.length > 0, references,
      expected_original_sha256: hash(action.code), original: action, linked_automations: linked,
      proposed_code: RETIRED,
      rollback: { model: "ir.actions.server", id, values: { code: action.code } },
    });
  }
  const result = {
    schema_version: 1, prepared_at: new Date().toISOString(), database: DB,
    status: "READ_ONLY_PROPOSAL_NOT_APPLIED", neutralization_verified: true,
    source_snapshot_sha256: hash(JSON.stringify({ actions, automations, views })),
    proposals,
    limitations: [
      "Literal references do not exclude dynamic or external callers.",
      "Recheck originals, bindings, inactive automations and neutralization immediately before applying.",
      "Writes, browser regression, rollback rehearsal and official Count LoC have not been performed.",
      "No savings are realized until deployment and billing adjustment are confirmed.",
    ],
    required_regressions: [
      "Create and duplicate a test quotation; preserve reference and revision.",
      "Change validity date, days and manual acceptance text in CA/ES/EN; save and reopen.",
      "Render the quote PDF and compare with the baseline.",
      "Check dimensional quantities, discounts, markup, transport and accepted-document protections.",
      "Check official Count LoC; rehearse restoration using the preserved originals.",
    ],
  };
  mkdirSync(dirname(output), { recursive: true, mode: 0o700 });
  writeFileSync(output, JSON.stringify(result, null, 2), { flag: "wx", mode: 0o600 });
  console.log(JSON.stringify({
    status: result.status, candidates: proposals.length,
    blocked: proposals.filter((row) => row.blocked).map((row) => row.id),
    proposal_sha256: hash(JSON.stringify(result)),
  }));
}

main().catch((error) => {
  // Do not print raw RPC bodies, credentials or extracted source.
  console.error(error.message);
  process.exitCode = 1;
});
