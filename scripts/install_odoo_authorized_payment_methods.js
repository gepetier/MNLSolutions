import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { requireConfig } from "../src/config.js";
import { OdooClient } from "../src/odooClient.js";

const client = new OdooClient(requireConfig());

const PARTNER_VIEW = "MNL - forma de pagament del client";
const ORDER_VIEW = "MNL - forma de pagament del pressupost";
const LEGACY_AUTOMATIONS = [
  "MNL - Forma de pagament autoritzada",
  "MNL - UI forma de pagament segons client",
  "MNL - UI condició segons forma de pagament",
];
const LEGACY_FIELD = "x_mnl_payment_method_id";
const TERM_NAMES = {
  transfer: "Transferència Bancaria",
  confirming60: "Confirming 60 dies",
  receipt30: "Rebut bancari 30 dies",
};
const TERM_LANGUAGES = ["en_US", "es_ES", "ca_ES"];

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function getNativeTerms() {
  const terms = await client.searchRead(
    "account.payment.term",
    [["active", "=", true]],
    ["id", "name", "active", "company_id", "line_ids"],
    { limit: 100, order: "id", context: { lang: "en_US" } },
  );
  if (terms.length !== 3) {
    throw new Error(`S'esperaven exactament 3 terminis de pagament natius actius i n'hi ha ${terms.length}.`);
  }
  const normalized = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const find = (predicate, label) => {
    const matches = terms.filter((term) => predicate(normalized(term.name)));
    if (matches.length !== 1) throw new Error(`No trobo un únic termini natiu per a ${label}.`);
    return matches[0];
  };
  return {
    transfer: find((name) => name.includes("transfer"), "Transferència Bancaria"),
    receipt30: find((name) => name.includes("rebut") && name.includes("30"), "Rebut bancari 30 dies"),
    confirming60: find((name) => name.includes("confirm") && name.includes("60"), "Confirming 60 dies"),
    all: terms,
  };
}

async function normalizeNativeTerms() {
  const terms = await client.searchRead(
    "account.payment.term",
    [["active", "=", true]],
    ["id", "name", "active", "line_ids"],
    { limit: 100, order: "id", context: { lang: "en_US" } },
  );
  const normalized = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const alreadyFinal = terms.length === 3
    && terms.some((term) => normalized(term.name).includes("transfer"))
    && terms.some((term) => normalized(term.name).includes("confirm") && normalized(term.name).includes("60"))
    && terms.some((term) => normalized(term.name).includes("rebut") && normalized(term.name).includes("30"));
  if (alreadyFinal) return { changed: false, migratedPartners: 0, migratedOrders: 0, archivedTermIds: [] };

  const byId = new Map(terms.map((term) => [term.id, term]));
  const transfer = byId.get(1) || terms.find((term) => /immediate/i.test(term.name));
  const confirming60 = byId.get(2) || terms.find((term) => /15 days/i.test(term.name));
  const receipt30 = byId.get(3) || terms.find((term) => /21 days/i.test(term.name));
  const previousReceipt = terms.find((term) => /^30 Days$/i.test(term.name));
  if (!transfer || !confirming60 || !receipt30 || !previousReceipt) {
    throw new Error("No es pot reconstruir amb seguretat la configuració nativa de pagaments esperada.");
  }
  if (confirming60.line_ids.length !== 1 || receipt30.line_ids.length !== 1) {
    throw new Error("Els terminis base per a Confirming i Rebut no tenen una única línia editable.");
  }

  const partners = await client.searchRead(
    "res.partner",
    [["property_payment_term_id", "=", previousReceipt.id]],
    ["id"],
    { limit: 10000 },
  );
  const orders = await client.searchRead(
    "sale.order",
    [["payment_term_id", "=", previousReceipt.id]],
    ["id"],
    { limit: 10000 },
  );
  if (partners.length) await client.write("res.partner", partners.map((record) => record.id), { property_payment_term_id: receipt30.id });
  if (orders.length) await client.write("sale.order", orders.map((record) => record.id), { payment_term_id: receipt30.id });

  await client.write("account.payment.term", [transfer.id], { name: "Transferència Bancaria" });
  await client.write("account.payment.term", [confirming60.id], { name: "Confirming 60 dies" });
  await client.write("account.payment.term.line", confirming60.line_ids, {
    value: "percent",
    value_amount: 100,
    delay_type: "days_after",
    nb_days: 60,
  });
  await client.write("account.payment.term", [receipt30.id], { name: "Rebut bancari 30 dies" });
  await client.write("account.payment.term.line", receipt30.line_ids, {
    value: "percent",
    value_amount: 100,
    delay_type: "days_after",
    nb_days: 30,
  });

  const keepIds = new Set([transfer.id, confirming60.id, receipt30.id]);
  const archivedTermIds = terms.filter((term) => !keepIds.has(term.id)).map((term) => term.id);
  if (archivedTermIds.length) await client.write("account.payment.term", archivedTermIds, { active: false });
  return {
    changed: true,
    migratedPartners: partners.length,
    migratedOrders: orders.length,
    archivedTermIds,
  };
}

async function ensureTermTranslations(terms) {
  const expected = [
    [terms.transfer.id, TERM_NAMES.transfer],
    [terms.confirming60.id, TERM_NAMES.confirming60],
    [terms.receipt30.id, TERM_NAMES.receipt30],
  ];
  for (const language of TERM_LANGUAGES) {
    const existing = await client.searchRead(
      "account.payment.term",
      [["id", "in", expected.map(([id]) => id)]],
      ["id", "name"],
      { limit: 3, context: { lang: language } },
    );
    const byId = new Map(existing.map((term) => [term.id, term.name]));
    if (byId.size !== expected.length) throw new Error(`Falten terminis per traduir en ${language}.`);
    for (const [id, name] of expected) {
      if (byId.get(id) !== name) {
        await client.call("account.payment.term", "write", [[id], { name }], { context: { lang: language } });
      }
    }
  }
}

function domainFor(terms) {
  return `[('id', 'in', [${terms.all.map((term) => term.id).join(", ")}])]`;
}

function partnerViewArch(terms) {
  return `<data>
  <xpath expr="//group[@name='sale']/field[@name='property_payment_term_id']" position="attributes">
    <attribute name="string">Forma de pagament</attribute>
    <attribute name="widget">selection</attribute>
    <attribute name="options">{'no_create': True, 'no_open': True}</attribute>
    <attribute name="domain">${domainFor(terms)}</attribute>
    <attribute name="invisible">0</attribute>
  </xpath>
  <xpath expr="//field[@name='property_inbound_payment_method_line_id']" position="attributes">
    <attribute name="invisible">1</attribute>
  </xpath>
  <xpath expr="//field[@name='property_outbound_payment_method_line_id']" position="attributes">
    <attribute name="invisible">1</attribute>
  </xpath>
</data>`;
}

function orderViewArch(terms) {
  return `<data>
  <xpath expr="//page[@name='mnl_conditions']//field[@name='payment_term_id']" position="attributes">
    <attribute name="string">Forma de pagament</attribute>
    <attribute name="widget">selection</attribute>
    <attribute name="options">{'no_create': True, 'no_open': True}</attribute>
    <attribute name="domain">${domainFor(terms)}</attribute>
    <attribute name="invisible">0</attribute>
  </xpath>
</data>`;
}

async function upsertView({ name, model, inheritId, priority, arch }) {
  const [existing] = await client.searchRead(
    "ir.ui.view",
    [["name", "=", name], ["model", "=", model]],
    ["id"],
    { limit: 1, context: { active_test: false } },
  );
  const values = {
    name,
    model,
    type: "form",
    mode: "extension",
    inherit_id: inheritId,
    priority,
    active: true,
    arch_db: arch,
  };
  if (existing) {
    await client.write("ir.ui.view", [existing.id], values);
    return existing.id;
  }
  return client.create("ir.ui.view", values);
}

async function resolveViewId(name, model, fallbackId) {
  const [view] = await client.searchRead(
    "ir.ui.view",
    [["name", "=", name], ["model", "=", model], ["active", "=", true]],
    ["id"],
    { limit: 1 },
  );
  return view?.id || fallbackId;
}

async function removeLegacyLayer() {
  const automations = await client.searchRead(
    "base.automation",
    [["name", "in", LEGACY_AUTOMATIONS]],
    ["id", "name", "active", "action_server_ids"],
    { limit: 20, context: { active_test: false } },
  );
  const automationIds = automations.map((item) => item.id);
  const actionIds = [...new Set(automations.flatMap((item) => item.action_server_ids || []))];
  if (automationIds.length) await client.unlink("base.automation", automationIds);
  if (actionIds.length) await client.unlink("ir.actions.server", actionIds);

  const externalFields = await client.searchRead(
    "ir.model.fields",
    [["model", "in", ["res.partner", "sale.order"]], ["name", "=", LEGACY_FIELD]],
    ["id"],
    { limit: 10 },
  );
  const externalFieldIds = externalFields.map((field) => field.id);
  if (externalFieldIds.length) await client.unlink("ir.model.fields", externalFieldIds);

  const [customModel] = await client.searchRead("ir.model", [["model", "=", "x_mnl_payment_method"]], ["id"], { limit: 1 });
  if (customModel) await client.unlink("ir.model", [customModel.id]);
  return { automationIds, actionIds, externalFieldIds, modelId: customModel?.id || false };
}

async function migrateAndClearLegacyValues(terms) {
  const model = await client.searchRead("ir.model", [["model", "=", "x_mnl_payment_method"]], ["id"], { limit: 1 });
  if (!model.length) return { partners: 0, orders: 0 };
  const methods = await client.searchRead("x_mnl_payment_method", [], ["id", "x_code"], { limit: 20 });
  const methodToTerm = new Map();
  for (const method of methods) {
    if (method.x_code === "transfer") methodToTerm.set(method.id, terms.transfer.id);
    if (method.x_code === "receipt_30") methodToTerm.set(method.id, terms.receipt30.id);
    if (method.x_code === "confirming_60") methodToTerm.set(method.id, terms.confirming60.id);
  }
  const partners = await client.searchRead("res.partner", [[LEGACY_FIELD, "!=", false]], ["id", LEGACY_FIELD], { limit: 10000 });
  const orders = await client.searchRead("sale.order", [[LEGACY_FIELD, "!=", false]], ["id", LEGACY_FIELD], { limit: 10000 });
  for (const record of partners) {
    const termId = methodToTerm.get(record[LEGACY_FIELD][0]);
    if (termId) await client.write("res.partner", [record.id], { property_payment_term_id: termId, [LEGACY_FIELD]: false });
  }
  for (const record of orders) {
    const termId = methodToTerm.get(record[LEGACY_FIELD][0]);
    if (termId) await client.write("sale.order", [record.id], { payment_term_id: termId, [LEGACY_FIELD]: false });
  }
  return { partners: partners.length, orders: orders.length };
}

async function updateQweb() {
  const views = await client.searchRead(
    "ir.ui.view",
    [["type", "=", "qweb"], "|", ["key", "ilike", "mnl_solutions.report_saleorder_style_"], ["name", "=", "mnl.sale.report.quote-phase-7"]],
    ["id", "name", "key", "arch_db"],
    { limit: 30 },
  );
  const updated = [];
  for (const view of views) {
    const before = view.arch_db || "";
    const after = before
      .replaceAll(
        `<span t-out="doc.${LEGACY_FIELD}.x_name if doc.${LEGACY_FIELD} else ''"/>`,
        `<span t-out="doc.payment_term_id.name if doc.payment_term_id else ''"/>`,
      )
      .replaceAll(
        `<span t-field="doc.${LEGACY_FIELD}.x_name"/>`,
        `<span t-out="doc.payment_term_id.name if doc.payment_term_id else ''"/>`,
      );
    if (after !== before) {
      await client.write("ir.ui.view", [view.id], { arch_db: after });
      updated.push(view.id);
    }
  }
  const [phase7] = await client.searchRead(
    "ir.ui.view",
    [["name", "=", "mnl.sale.report.quote-phase-7"]],
    ["id", "arch_db"],
    { limit: 1 },
  );
  const reportViews = phase7 ? [phase7] : views.filter((view) => /mnl_solutions\.report_saleorder_style_/.test(view.key || ""));
  if (
    !reportViews.length
    || reportViews.some((view) => (view.arch_db || "").includes(LEGACY_FIELD))
    || !reportViews.some((view) => (view.arch_db || "").includes("doc.payment_term_id"))
  ) {
    throw new Error("Els informes MNL no han quedat connectats exclusivament al termini natiu d'Odoo.");
  }
  return updated;
}

async function backup() {
  const terms = await client.searchRead("account.payment.term", [], ["id", "name", "active", "line_ids"], { limit: 100 });
  const legacyReceipt = terms.find((term) => /^30 Days$/i.test(term.name));
  const migratedReferences = legacyReceipt ? {
    legacyReceiptTermId: legacyReceipt.id,
    partners: await client.searchRead(
      "res.partner", [["property_payment_term_id", "=", legacyReceipt.id]], ["id", "property_payment_term_id"], { limit: 10000 },
    ),
    orders: await client.searchRead(
      "sale.order", [["payment_term_id", "=", legacyReceipt.id]], ["id", "payment_term_id"], { limit: 10000 },
    ),
  } : { legacyReceiptTermId: null, partners: [], orders: [] };
  const termTranslations = {};
  for (const language of TERM_LANGUAGES) {
    termTranslations[language] = await client.searchRead(
      "account.payment.term", [], ["id", "name"], { limit: 100, context: { lang: language } },
    );
  }
  const automations = await client.searchRead(
    "base.automation",
    [["name", "in", LEGACY_AUTOMATIONS]],
    ["id", "name", "active", "trigger", "action_server_ids"],
    { limit: 20, context: { active_test: false } },
  );
  const views = await client.searchRead(
    "ir.ui.view",
    ["|", ["name", "in", [PARTNER_VIEW, ORDER_VIEW]], ["name", "=", "mnl.sale.report.quote-phase-7"]],
    ["id", "name", "model", "active", "inherit_id", "arch_db"],
    { limit: 20, context: { active_test: false } },
  );
  mkdirSync("logs", { recursive: true });
  const file = join("logs", `odoo-native-payment-terms-backup-${client.database}-${stamp()}.json`);
  writeFileSync(file, JSON.stringify({ database: client.database, backedUpAt: new Date().toISOString(), terms, termTranslations, migratedReferences, automations, views }, null, 2));
  return file;
}

async function inspect() {
  const terms = await getNativeTerms();
  const fields = await client.searchRead(
    "ir.model.fields",
    [["model", "in", ["res.partner", "sale.order"]], ["name", "in", ["property_payment_term_id", "payment_term_id", LEGACY_FIELD]]],
    ["id", "model", "name", "field_description", "ttype", "relation"],
    { limit: 20 },
  );
  const automations = await client.searchRead(
    "base.automation",
    [["name", "in", LEGACY_AUTOMATIONS]],
    ["id", "name", "active"],
    { limit: 20, context: { active_test: false } },
  );
  const views = await client.searchRead(
    "ir.ui.view",
    [["name", "in", [PARTNER_VIEW, ORDER_VIEW, "mnl.sale.report.quote-phase-7"]]],
    ["id", "name", "model", "active", "arch_db"],
    { limit: 20, context: { active_test: false } },
  );
  const testOrders = await client.searchRead(
    "sale.order",
    [["client_order_ref", "ilike", "TEST-NATIVE-PAYMENT-"]],
    ["id", "name", "state", "client_order_ref"],
    { limit: 20 },
  );
  return {
    database: client.database,
    nativeTerms: terms.all,
    mappings: {
      transfer: terms.transfer.id,
      receipt30: terms.receipt30.id,
      confirming60: terms.confirming60.id,
    },
    nativeFields: fields.filter((field) => field.name !== LEGACY_FIELD),
    dormantLegacyFields: fields.filter((field) => field.name === LEGACY_FIELD),
    legacyAutomations: automations,
    views: views.map((view) => ({
      id: view.id,
      name: view.name,
      active: view.active,
      usesNativeTerm: (view.arch_db || "").includes(view.model === "res.partner" ? "property_payment_term_id" : "payment_term_id"),
      usesLegacyField: (view.arch_db || "").includes(LEGACY_FIELD),
    })),
    testOrders,
  };
}

async function validate(terms) {
  const partnerId = await client.create("res.partner", {
    name: "MNL TEST NATIVE PAYMENT - DO NOT USE",
    customer_rank: 1,
    property_payment_term_id: terms.transfer.id,
  });
  let orderId;
  try {
    orderId = await client.create("sale.order", {
      partner_id: partnerId,
      client_order_ref: `TEST-NATIVE-PAYMENT-${new Date().toISOString()}`,
    });
    const [inherited] = await client.searchRead("sale.order", [["id", "=", orderId]], ["payment_term_id"], { limit: 1 });
    await client.write("sale.order", [orderId], { payment_term_id: terms.receipt30.id });
    const [receipt] = await client.searchRead("sale.order", [["id", "=", orderId]], ["payment_term_id"], { limit: 1 });
    const [partnerAfter] = await client.searchRead("res.partner", [["id", "=", partnerId]], ["property_payment_term_id"], { limit: 1 });
    await client.write("sale.order", [orderId], { payment_term_id: terms.confirming60.id });
    const [product] = await client.searchRead("product.product", [["default_code", "=", "MNL-PORTES"]], ["id"], { limit: 1 });
    if (!product) throw new Error("No trobo el producte de servei per confirmar la prova.");
    await client.create("sale.order.line", {
      order_id: orderId,
      product_id: product.id,
      name: "Prova termini de pagament natiu",
      product_uom_qty: 1,
      price_unit: 1,
    });
    await client.call("sale.order", "action_confirm", [[orderId]]);
    const [confirmed] = await client.searchRead("sale.order", [["id", "=", orderId]], ["state", "payment_term_id"], { limit: 1 });
    const checks = {
      inheritedFromPartner: inherited.payment_term_id?.[0] === terms.transfer.id,
      orderCanOverride: receipt.payment_term_id?.[0] === terms.receipt30.id,
      overrideDoesNotChangePartner: partnerAfter.property_payment_term_id?.[0] === terms.transfer.id,
      preservedOnConfirmation: confirmed.state === "sale" && confirmed.payment_term_id?.[0] === terms.confirming60.id,
    };
    if (Object.values(checks).some((value) => !value)) throw new Error(`Validació fallida: ${JSON.stringify(checks)}`);
    return checks;
  } finally {
    if (orderId) {
      try {
        const [order] = await client.searchRead("sale.order", [["id", "=", orderId]], ["state"], { limit: 1 });
        if (order?.state === "sale") await client.call("sale.order", "action_cancel", [[orderId]]);
        await client.unlink("sale.order", [orderId]);
      } catch {}
    }
    try { await client.unlink("res.partner", [partnerId]); } catch {}
  }
}

async function install() {
  const backupFile = await backup();
  const normalization = await normalizeNativeTerms();
  const terms = await getNativeTerms();
  await ensureTermTranslations(terms);
  const legacyValuesMigrated = await migrateAndClearLegacyValues(terms);
  const partnerParentViewId = await resolveViewId("res.partner.property.form.inherit", "res.partner", 854);
  const orderParentViewId = await resolveViewId("mnl.sale.order.form.quote-phases-4-6", "sale.order", 2244);
  const viewIds = {
    partner: await upsertView({ name: PARTNER_VIEW, model: "res.partner", inheritId: partnerParentViewId, priority: 98, arch: partnerViewArch(terms) }),
    order: await upsertView({ name: ORDER_VIEW, model: "sale.order", inheritId: orderParentViewId, priority: 99, arch: orderViewArch(terms) }),
  };
  const qwebUpdated = await updateQweb();
  const legacyLayerRemoved = await removeLegacyLayer();
  const result = { database: client.database, backupFile, normalization, termIds: terms.all.map((term) => term.id), legacyValuesMigrated, legacyLayerRemoved, viewIds, qwebUpdated };
  const logFile = join("logs", `odoo-native-payment-terms-install-${client.database}-${stamp()}.json`);
  writeFileSync(logFile, JSON.stringify(result, null, 2));
  return { ...result, logFile, terms };
}

async function main() {
  await client.authenticate();
  if (process.argv.includes("--inspect")) {
    console.log(JSON.stringify(await inspect(), null, 2));
    return;
  }
  if (!process.argv.includes("--apply")) throw new Error("Operació d'escriptura: executa amb --apply i ODOO_ENV_FILE=112.env.");
  const productionApply = process.argv.includes("--production") && client.database === "mnl-technical-consultant";
  const testApply = process.argv.includes("--test") && /^provesmnl\d+$/.test(client.database);
  if (!productionApply && !testApply) {
    throw new Error(`Indica --test per a una base provesmnl o --production per a mnl-technical-consultant; base actual: ${client.database}.`);
  }
  const installation = await install();
  const validation = process.argv.includes("--test") ? await validate(installation.terms) : null;
  console.log(JSON.stringify({ installation: { ...installation, terms: undefined }, validation, inspection: await inspect() }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exitCode = 1;
});
