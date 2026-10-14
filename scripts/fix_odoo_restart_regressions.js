import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { requireConfig } from "../src/config.js";
import { OdooClient } from "../src/odooClient.js";

const client = new OdooClient(requireConfig());
const productionTarget = process.argv.includes("--production") && client.database === "mnl-technical-consultant";
const testTarget = client.database === "provesmnl202609" && new URL(client.url).hostname === "provesmnl202609.odoo.com";
if (!productionTarget && !testTarget) throw new Error(`Indica --production per a mnl-technical-consultant o usa provesmnl202609; base actual: ${client.database}`);

const TERM_NAMES = ["Transferència Bancaria", "Confirming 60 dies", "Rebut bancari 30 dies"];
const LANGUAGES = ["en_US", "es_ES", "ca_ES"];
const OLD_TRANSLATIONS = {
  es_ES: ["Pago inmediato", "15 días", "21 Días"],
  ca_ES: ["Pagament immediat", "15 dies", "21 dies"],
};
const ACTION_ID = 822;
const ORDER_ID = 20;
const PORTES_LINE_ID = 76;
const CANONICAL_SECTION_ID = 77;
const DUPLICATE_SECTION_ID = 78;

async function names(language) {
  return client.searchRead(
    "account.payment.term",
    [["id", "in", [1, 2, 3]]],
    ["id", "name", "active", "line_ids"],
    { limit: 3, order: "id", context: { lang: language } },
  );
}

async function snapshot() {
  const termNames = {};
  for (const language of LANGUAGES) termNames[language] = await names(language);
  const termLines = await client.searchRead(
    "account.payment.term.line",
    [["id", "in", [1, 2, 3]]],
    ["id", "payment_id", "value", "value_amount", "delay_type", "nb_days"],
    { limit: 3, order: "id" },
  );
  const [action] = await client.searchRead(
    "ir.actions.server",
    [["id", "=", ACTION_ID]],
    ["id", "name", "code"],
    { limit: 1 },
  );
  const [order] = productionTarget ? [null] : await client.searchRead(
    "sale.order",
    [["id", "=", ORDER_ID]],
    ["id", "name", "state", "payment_term_id", "order_line", "amount_total"],
    { limit: 1 },
  );
  const orderLines = order ? await client.searchRead(
    "sale.order.line",
    [["id", "in", order.order_line]],
    ["id", "order_id", "name", "display_type", "sequence", "x_studio_classificador", "x_studio_familia", "product_id", "product_uom_qty"],
    { limit: 20, order: "sequence,id" },
  ) : [];
  return { termNames, termLines, action, order, orderLines };
}

function replaceOnce(source, before, after, label) {
  const matches = source.split(before).length - 1;
  if (matches !== 1) throw new Error(`No puc ajustar ${label}: el patró apareix ${matches} vegades.`);
  return source.replace(before, after);
}

function correctedActionCode(original) {
  let code = replaceOnce(
    original,
    "if not env.context.get('mnl_section_sync'):",
    `def bare_family(value):
    text = (value or '').strip()
    while '·' in text:
        prefix, rest = text.split('·', 1)
        if not prefix.strip().isdigit():
            break
        text = rest.strip()
    return text or 'Sense familia'

if not env.context.get('mnl_section_sync'):` ,
    "normalització de família",
  );
  code = replaceOnce(
    code,
    "family = (row.product_id.categ_id.name or row.x_studio_familia or 'Sense familia').strip()",
    "family = bare_family(row.product_id.categ_id.name or row.x_studio_familia)",
    "família de producte",
  );
  code = replaceOnce(
    code,
    "section_text = (row.name or '').strip()\n            if '·' in section_text:\n                section_text = section_text.split('·', 1)[1].strip()",
    "section_text = bare_family(row.name)",
    "secció existent",
  );
  return code;
}

function assertCurrent(before, { production = false } = {}) {
  if (production && !before.action) throw new Error("No trobo l'acció MNL de classificador i família a principal.");
  if (!production && (!before.action || !before.order || before.order.name !== "REGRESSIO-WEB-20260923-A" || before.order.state !== "draft")) {
    throw new Error("No trobo el pressupost de regressió i l'acció esperats en estat esborrany.");
  }
  if (before.termNames.en_US.map((term) => term.name).join("|") !== TERM_NAMES.join("|")) {
    throw new Error("Els noms base dels terminis han canviat; aturo l'ajust.");
  }
  for (const language of LANGUAGES) {
    if (before.termNames[language].length !== 3 || before.termNames[language].some((term) => !term.active)) {
      throw new Error(`Els tres terminis esperats no són actius en ${language}.`);
    }
    if (OLD_TRANSLATIONS[language]) {
      before.termNames[language].forEach((term, index) => {
        if (![OLD_TRANSLATIONS[language][index], TERM_NAMES[index]].includes(term.name)) {
          throw new Error(`Traducció inesperada del termini ${term.id} en ${language}: ${term.name}`);
        }
      });
    }
  }
  if (before.termLines.map((line) => line.nb_days).join("|") !== "0|60|30") {
    throw new Error("Els dies dels terminis no coincideixen amb 0/60/30.");
  }
  if (!production) {
    const byId = new Map(before.orderLines.map((line) => [line.id, line]));
    if (byId.get(PORTES_LINE_ID)?.product_id?.[0] !== 5762 || byId.get(CANONICAL_SECTION_ID)?.name !== "2 · SENSE FAMILIA") {
      throw new Error("Les línies de Portes del pressupost han canviat.");
    }
    const duplicate = byId.get(DUPLICATE_SECTION_ID);
    if (duplicate && (duplicate.name !== "2 · 2 · SENSE FAMILIA" || duplicate.display_type !== "line_section")) {
      throw new Error("La secció duplicada ja no coincideix amb la prova.");
    }
  }
}

async function runSectionAction() {
  return client.call("ir.actions.server", "run", [[ACTION_ID]], {
    context: { active_model: "sale.order.line", active_id: PORTES_LINE_ID, active_ids: [PORTES_LINE_ID] },
  });
}

const before = await snapshot();
assertCurrent(before, { production: productionTarget });
const newCode = before.action.code.includes("def bare_family(value):")
  ? before.action.code
  : correctedActionCode(before.action.code);

if (!process.argv.includes("--apply")) {
  console.log(JSON.stringify({
    database: client.database,
    paymentTranslations: Object.fromEntries(LANGUAGES.map((language) => [language, before.termNames[language].map((term) => term.name)])),
    actionNeedsUpdate: newCode !== before.action.code,
    duplicateSection: before.orderLines.find((line) => line.id === DUPLICATE_SECTION_ID) || null,
  }, null, 2));
} else {
  if (productionTarget && !process.argv.includes("--production")) throw new Error("Per aplicar a principal, indica explícitament --production.");
  mkdirSync("logs", { recursive: true });
  const backupFile = join("logs", `odoo-restart-regressions-backup-${client.database}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(backupFile, JSON.stringify({ database: client.database, at: new Date().toISOString(), before }, null, 2));

  for (const language of ["es_ES", "ca_ES"]) {
    for (let index = 0; index < 3; index += 1) {
      if (before.termNames[language][index].name === TERM_NAMES[index]) continue;
      await client.call("account.payment.term", "write", [[index + 1], { name: TERM_NAMES[index] }], { context: { lang: language } });
    }
  }
  if (newCode !== before.action.code) await client.write("ir.actions.server", [ACTION_ID], { code: newCode });

  const afterTranslations = await snapshot();
  for (const language of LANGUAGES) {
    if (afterTranslations.termNames[language].map((term) => term.name).join("|") !== TERM_NAMES.join("|")) {
      throw new Error(`La verificació de traduccions ha fallat en ${language}; backup: ${backupFile}`);
    }
  }
  if (afterTranslations.action.code !== newCode) throw new Error(`L'acció no s'ha desat; backup: ${backupFile}`);

  if (productionTarget) {
    const after = await snapshot();
    console.log(JSON.stringify({ database: client.database, backupFile, paymentTranslations: Object.fromEntries(LANGUAGES.map((language) => [language, after.termNames[language].map((term) => term.name)])), actionUpdated: after.action.code === newCode }, null, 2));
  } else {
  await runSectionAction();
  const afterSync = await snapshot();
  const portes = afterSync.orderLines.find((line) => line.id === PORTES_LINE_ID);
  const canonical = afterSync.orderLines.find((line) => line.id === CANONICAL_SECTION_ID);
  const duplicate = afterSync.orderLines.find((line) => line.id === DUPLICATE_SECTION_ID);
  if (portes?.x_studio_familia !== "2 · SENSE FAMILIA" || canonical?.name !== "2 · SENSE FAMILIA") {
    throw new Error(`La sincronització de la família ha fallat; backup: ${backupFile}`);
  }
  if (duplicate) {
    if (duplicate.name !== "2 · 2 · SENSE FAMILIA" || duplicate.display_type !== "line_section") {
      throw new Error(`La secció duplicada ha canviat abans de retirar-la; backup: ${backupFile}`);
    }
    await client.unlink("sale.order.line", [DUPLICATE_SECTION_ID]);
  }

  await runSectionAction();
  const after = await snapshot();
  const finalSections = after.orderLines.filter((line) => line.display_type === "line_section");
  if (finalSections.length !== 2 || after.orderLines.some((line) => line.id === DUPLICATE_SECTION_ID)) {
    throw new Error(`Encara hi ha seccions duplicades; backup: ${backupFile}`);
  }
  console.log(JSON.stringify({
    database: client.database,
    backupFile,
    paymentTranslations: Object.fromEntries(LANGUAGES.map((language) => [language, after.termNames[language].map((term) => term.name)])),
    order: after.order.name,
    orderTotal: after.order.amount_total,
    sectionNames: finalSections.map((line) => line.name),
    portesFamily: after.orderLines.find((line) => line.id === PORTES_LINE_ID)?.x_studio_familia,
    removedDuplicateSectionId: duplicate ? DUPLICATE_SECTION_ID : null,
  }, null, 2));
  }
}
