import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { requireConfig } from "../src/config.js";
import { OdooClient } from "../src/odooClient.js";

const client = new OdooClient(requireConfig());
const TEST_DATABASE = "provesmnl202609";
const MODEL = "res.partner";
const FIELD = "x_studio_nivell_risc";
const VIEW_NAME = "mnl.res.partner.form.client-fields";
const SELECTION = "[('baix', 'Baix'), ('mig', 'Mig'), ('alt', 'Alt')]";

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function modelId() {
  const [model] = await client.searchRead("ir.model", [["model", "=", MODEL]], ["id", "model"], { limit: 1 });
  if (!model) throw new Error(`No trobo el model ${MODEL}.`);
  return model.id;
}

async function currentState() {
  const id = await modelId();
  const [field] = await client.searchRead(
    "ir.model.fields",
    [["model_id", "=", id], ["name", "=", FIELD]],
    ["id", "name", "field_description", "ttype", "selection", "state", "store"],
    { limit: 1 },
  );
  const [view] = await client.searchRead(
    "ir.ui.view",
    [["name", "=", VIEW_NAME], ["model", "=", MODEL]],
    ["id", "name", "model", "type", "mode", "inherit_id", "priority", "active", "arch_db"],
    { limit: 2, context: { active_test: false } },
  );
  if (!view) throw new Error(`No trobo la vista existent ${VIEW_NAME}; no faré cap canvi.`);
  if (!view.arch_db.includes('name="x_studio_contacte_principal_id"')) {
    throw new Error("La vista no conté el camp de contacte principal esperat; no faré cap canvi.");
  }
  return { modelId: id, field: field || null, view };
}

function viewWithRiskField(arch) {
  if (arch.includes(`name="${FIELD}"`)) return arch;
  return arch.replace(
    /(<field\s+name="x_studio_contacte_principal_id"[^>]*\/>)/,
    `$1\n          <field name="${FIELD}"/>`,
  );
}

async function apply() {
  const productionApply = process.argv.includes("--production") && client.database === "mnl-technical-consultant";
  const testApply = process.argv.includes("--test") && client.database === TEST_DATABASE;
  if (!productionApply && !testApply) throw new Error(`Indica --test per a ${TEST_DATABASE} o --production per a mnl-technical-consultant.`);
  const before = await currentState();
  const backup = {
    database: client.database,
    backedUpAt: new Date().toISOString(),
    fieldExisted: Boolean(before.field),
    field: before.field,
    view: before.view,
  };
  mkdirSync("logs", { recursive: true });
  const backupFile = join("logs", `odoo-customer-risk-backup-${client.database}-${stamp()}.json`);
  writeFileSync(backupFile, JSON.stringify(backup, null, 2));

  let fieldId = before.field?.id || null;
  if (before.field) {
    if (before.field.ttype !== "selection") throw new Error(`El camp ${FIELD} ja existeix amb tipus ${before.field.ttype}.`);
    await client.write("ir.model.fields", [before.field.id], {
      field_description: "Nivell de risc MNL",
      selection: SELECTION,
      store: true,
    });
  } else {
    fieldId = await client.create("ir.model.fields", {
      model_id: before.modelId,
      name: FIELD,
      field_description: "Nivell de risc MNL",
      ttype: "selection",
      selection: SELECTION,
      state: "manual",
      store: true,
    });
  }

  const updatedArch = viewWithRiskField(before.view.arch_db);
  if (updatedArch === before.view.arch_db && before.field) {
    console.log(JSON.stringify({ database: client.database, status: "already_installed", fieldId, viewId: before.view.id }, null, 2));
    return;
  }
  await client.write("ir.ui.view", [before.view.id], { arch_db: updatedArch });

  const [fieldCheck] = await client.searchRead(
    "ir.model.fields",
    [["model_id", "=", before.modelId], ["name", "=", FIELD]],
    ["id", "name", "field_description", "ttype", "selection"],
    { limit: 1 },
  );
  const [viewCheck] = await client.searchRead("ir.ui.view", [["id", "=", before.view.id]], ["id", "arch_db"], { limit: 1 });
  if (!fieldCheck || fieldCheck.ttype !== "selection" || !viewCheck?.arch_db.includes(`name="${FIELD}"`)) {
    throw new Error("La verificació posterior no ha trobat el camp i la seva vista.");
  }
  const result = { database: client.database, status: "installed_and_verified", field: fieldCheck, viewId: viewCheck.id, backupFile };
  const logFile = join("logs", `odoo-customer-risk-install-${client.database}-${stamp()}.json`);
  writeFileSync(logFile, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ ...result, logFile }, null, 2));
}

async function rollback(filePath) {
  const productionApply = process.argv.includes("--production") && client.database === "mnl-technical-consultant";
  const testApply = process.argv.includes("--test") && client.database === TEST_DATABASE;
  if (!productionApply && !testApply) throw new Error(`Indica --test per a ${TEST_DATABASE} o --production per a mnl-technical-consultant.`);
  const backup = JSON.parse(readFileSync(resolve(filePath), "utf8"));
  if (backup.database !== client.database) throw new Error("La còpia de seguretat pertany a una altra base de dades.");
  await client.write("ir.ui.view", [backup.view.id], { arch_db: backup.view.arch_db });
  const id = await modelId();
  const [field] = await client.searchRead("ir.model.fields", [["model_id", "=", id], ["name", "=", FIELD]], ["id"], { limit: 1 });
  if (field && !backup.fieldExisted) await client.unlink("ir.model.fields", [field.id]);
  else if (field && backup.field) {
    await client.write("ir.model.fields", [field.id], {
      field_description: backup.field.field_description,
      ttype: backup.field.ttype,
      selection: backup.field.selection,
      store: backup.field.store,
    });
  }
  console.log(JSON.stringify({ database: client.database, status: "rolled_back", backupFile: resolve(filePath) }, null, 2));
}

async function main() {
  await client.authenticate();
  const rollbackIndex = process.argv.indexOf("--rollback");
  if (rollbackIndex !== -1) {
    const file = process.argv[rollbackIndex + 1];
    if (!file || file.startsWith("--") || !existsSync(resolve(file))) throw new Error("Indica un fitxer de còpia de seguretat existent després de --rollback.");
    await rollback(file);
    return;
  }
  if (process.argv.includes("--apply")) {
    if (!process.argv.includes("--test") && !process.argv.includes("--production")) {
      throw new Error("Per aplicar el canvi cal indicar explícitament --apply --test o --apply --production.");
    }
    await apply();
    return;
  }
  const state = await currentState();
  console.log(JSON.stringify({
    database: client.database,
    field: state.field,
    expectedSelection: SELECTION,
    viewId: state.view.id,
    viewName: state.view.name,
    alreadyVisible: state.view.arch_db.includes(`name="${FIELD}"`),
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exitCode = 1;
});
