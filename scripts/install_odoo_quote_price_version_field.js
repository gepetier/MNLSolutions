import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { requireConfig } from "../src/config.js";
import { OdooClient } from "../src/odooClient.js";

const config = requireConfig();
const client = new OdooClient(config);
const PARENT_VIEW_NAME = "mnl.sale.order.form.quote-phases-4-6";
const EXTENSION_VIEW_NAME = "mnl.sale.order.form.pricelist-version";
const EXTENSION_VIEW_ARCH = `<data>
  <xpath expr="//page[@name='mnl_prices']//field[@name='pricelist_id']" position="attributes">
    <attribute name="string">Versió de preus</attribute>
    <attribute name="options">{'no_open': True, 'no_create': True}</attribute>
    <attribute name="invisible">0</attribute>
  </xpath>
</data>`;

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function findView(name) {
  const views = await client.searchRead(
    "ir.ui.view",
    [["name", "=", name], ["model", "=", "sale.order"], ["active", "=", true]],
    ["id", "name", "model", "type", "mode", "inherit_id", "priority", "active", "arch_db"],
    { limit: 5 },
  );
  if (views.length > 1) throw new Error(`Hi ha més d'una vista activa amb el nom ${name}.`);
  return views[0] || null;
}

async function inspect() {
  const parent = await findView(PARENT_VIEW_NAME);
  if (!parent) throw new Error(`No trobo la vista base ${PARENT_VIEW_NAME}.`);
  const extension = await findView(EXTENSION_VIEW_NAME);
  const hidden = /<field[^>]*name="pricelist_id"[^>]*invisible="1"/.test(parent.arch_db || "");
  return {
    database: config.database,
    parentView: { id: parent.id, name: parent.name, hasPricelistField: /name="pricelist_id"/.test(parent.arch_db || ""), hiddenByParent: hidden },
    extensionView: extension
      ? { id: extension.id, name: extension.name, priority: extension.priority, active: extension.active, hasShowRule: /<attribute name="invisible">0<\/attribute>/.test(extension.arch_db || "") }
      : null,
  };
}

async function apply() {
  if (!/^provesmnl\d+$/.test(config.database)) {
    throw new Error(`Aquest instal·lador només funciona a Proves; base actual: ${config.database}.`);
  }
  const parent = await findView(PARENT_VIEW_NAME);
  if (!parent) throw new Error(`No trobo la vista base ${PARENT_VIEW_NAME}.`);
  if (!/name="pricelist_id"/.test(parent.arch_db || "")) throw new Error("La vista base ja no conté el camp pricelist_id.");

  const existing = await findView(EXTENSION_VIEW_NAME);
  const backup = {
    generatedAt: new Date().toISOString(),
    database: config.database,
    parentViewId: parent.id,
    extensionWasPresent: Boolean(existing),
    previousExtension: existing,
  };
  mkdirSync("logs", { recursive: true });
  const backupFile = resolve(join("logs", `odoo-pricelist-field-backup-${config.database}-${stamp()}.json`));
  writeFileSync(backupFile, `${JSON.stringify(backup, null, 2)}\n`, "utf8");

  const values = {
    name: EXTENSION_VIEW_NAME,
    model: "sale.order",
    type: "form",
    mode: "extension",
    inherit_id: parent.id,
    priority: 100,
    active: true,
    arch_db: EXTENSION_VIEW_ARCH,
  };
  let extensionId;
  if (existing) {
    extensionId = existing.id;
    await client.write("ir.ui.view", [existing.id], values);
  } else {
    extensionId = await client.create("ir.ui.view", values);
  }

  const applied = await client.searchRead("ir.ui.view", [["id", "=", extensionId]], ["id", "name", "priority", "active", "arch_db"], { limit: 1 });
  if (applied.length !== 1 || !applied[0].active || !/name="invisible">0<\/attribute>/.test(applied[0].arch_db || "")) {
    throw new Error("No he pogut verificar que la vista mostri el camp de versió.");
  }
  return { database: config.database, parentViewId: parent.id, extensionViewId: extensionId, backupFile, visibleField: "pricelist_id", tab: "Preus" };
}

async function rollback(path) {
  if (!/^provesmnl\d+$/.test(config.database)) throw new Error("El rollback només es permet a Proves.");
  if (!path) throw new Error("Indica el fitxer de backup creat durant la instal·lació.");
  const backup = JSON.parse(readFileSync(resolve(path), "utf8"));
  if (backup.database !== config.database) throw new Error(`El backup pertany a ${backup.database}, no a ${config.database}.`);
  const extension = await findView(EXTENSION_VIEW_NAME);
  if (!extension) return { database: config.database, rolledBack: false, reason: "La vista d'extensió ja no existeix." };
  if (backup.extensionWasPresent) {
    const previous = backup.previousExtension;
    await client.write("ir.ui.view", [extension.id], {
      name: previous.name,
      model: previous.model,
      type: previous.type,
      mode: previous.mode,
      inherit_id: previous.inherit_id?.[0] || false,
      priority: previous.priority,
      active: previous.active,
      arch_db: previous.arch_db,
    });
  } else {
    await client.write("ir.ui.view", [extension.id], { active: false });
  }
  return { database: config.database, rolledBack: true, extensionViewId: extension.id };
}

async function main() {
  await client.authenticate();
  if (process.argv.includes("--inspect")) {
    console.log(JSON.stringify(await inspect(), null, 2));
    return;
  }
  const rollbackIndex = process.argv.indexOf("--rollback");
  if (rollbackIndex >= 0) {
    console.log(JSON.stringify(await rollback(process.argv[rollbackIndex + 1]), null, 2));
    return;
  }
  if (!process.argv.includes("--apply")) throw new Error("Executa amb --inspect, --apply o --rollback <fitxer-backup>.");
  console.log(JSON.stringify(await apply(), null, 2));
}

main().catch((error) => {
  console.error(error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exitCode = 1;
});
