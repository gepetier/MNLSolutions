#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { OdooClient } from "../src/odooClient.js";

const APPLY = process.argv.includes("--apply");
const SOURCE_FILE = process.argv.find((arg) => arg.startsWith("--source="))?.slice(9) || "112.env";
const TARGET_FILE = process.argv.find((arg) => arg.startsWith("--target="))?.slice(9) || "BDprincipal.env";
const QUOTE_MODELS = new Set(["sale.order", "sale.order.line", "product.template", "res.partner"]);
const QUOTE_VIEW_NAMES = ["mnl.sale.order.form.quote-phases-4-6", "Odoo Studio: sale.order.form customization"];
const FIELD_PROPERTIES = [
  "field_description", "relation", "relation_field", "selection", "required", "readonly", "store", "index", "copied",
  "on_delete", "domain", "help", "tracking", "compute", "depends", "related",
];

function loadConfig(path) {
  const values = {};
  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 0) continue;
    values[line.slice(0, separator).trim()] = line.slice(separator + 1).trim().replace(/^['\"]|['\"]$/g, "");
  }
  for (const key of ["ODOO_URL", "ODOO_DB", "ODOO_USERNAME"]) {
    if (!values[key]) throw new Error(`Falta ${key} a ${path}.`);
  }
  if (!values.ODOO_API_KEY && !values.ODOO_PASSWORD) throw new Error(`Falta ODOO_API_KEY a ${path}.`);
  return { url: values.ODOO_URL, database: values.ODOO_DB, username: values.ODOO_USERNAME, apiKey: values.ODOO_API_KEY || values.ODOO_PASSWORD };
}

function clientFor(path) {
  return new OdooClient(loadConfig(path));
}

function truthyValue(value) {
  return value !== false && value !== null && value !== undefined && value !== "";
}

function fieldValues(field, modelId, { creating }) {
  const values = {};
  if (creating) {
    values.name = field.name;
    values.model_id = modelId;
    values.ttype = field.ttype;
  }
  for (const property of FIELD_PROPERTIES) {
    const value = field[property];
    if (["required", "readonly", "store", "index", "copied", "tracking"].includes(property)) {
      values[property] = value || false;
    } else if (truthyValue(value)) {
      values[property] = value;
    }
  }
  if (creating && field.ttype !== "many2one" && field.ttype !== "many2many") delete values.on_delete;
  if (!creating) {
    delete values.relation;
    delete values.relation_field;
    delete values.selection;
    delete values.related;
  }
  return values;
}

async function readQuoteFields(client) {
  const fields = await client.searchRead(
    "ir.model.fields",
    [["name", "=like", "x_studio_%"]],
    ["name", "model", "ttype", ...FIELD_PROPERTIES],
  );
  return fields.filter((field) => QUOTE_MODELS.has(field.model));
}

async function modelIds(client) {
  const models = await client.searchRead("ir.model", [["model", "in", [...QUOTE_MODELS]]], ["model"]);
  return new Map(models.map((model) => [model.model, model.id]));
}

async function syncFields(source, target, report) {
  const [sourceFields, targetFields, targetModels] = await Promise.all([readQuoteFields(source), readQuoteFields(target), modelIds(target)]);
  const targetByKey = new Map(targetFields.map((field) => [`${field.model}:${field.name}`, field]));
  const missing = sourceFields.filter((field) => !targetByKey.has(`${field.model}:${field.name}`));
  const existing = sourceFields.filter((field) => targetByKey.has(`${field.model}:${field.name}`));

  for (const field of missing.filter((item) => !item.compute)) {
    const values = fieldValues(field, targetModels.get(field.model), { creating: true });
    if (APPLY) await target.create("ir.model.fields", values);
    report.fields.created.push(`${field.model}.${field.name}`);
  }

  const pending = missing.filter((item) => item.compute);
  while (pending.length) {
    let progressed = false;
    for (let index = pending.length - 1; index >= 0; index -= 1) {
      const field = pending[index];
      const values = fieldValues(field, targetModels.get(field.model), { creating: true });
      try {
        if (APPLY) await target.create("ir.model.fields", values);
        report.fields.created.push(`${field.model}.${field.name}`);
        pending.splice(index, 1);
        progressed = true;
      } catch (error) {
        report.fields.deferred.set(`${field.model}.${field.name}`, error.message);
      }
    }
    if (!progressed) {
      for (const [name, reason] of report.fields.deferred) report.errors.push(`No s'ha pogut crear ${name}: ${reason}`);
      break;
    }
  }

  if (APPLY && pending.length) throw new Error("Hi ha camps calculats pendents; no s'activen automatitzacions amb una configuració incompleta.");

  if (APPLY) {
    const refreshedFields = await readQuoteFields(target);
    const refreshedByKey = new Map(refreshedFields.map((field) => [`${field.model}:${field.name}`, field]));
    for (const sourceField of existing) {
      const targetField = refreshedByKey.get(`${sourceField.model}:${sourceField.name}`);
      await target.write("ir.model.fields", [targetField.id], fieldValues(sourceField, null, { creating: false }));
      report.fields.updated.push(`${sourceField.model}.${sourceField.name}`);
    }
  } else {
    report.fields.updated.push(...existing.map((field) => `${field.model}.${field.name}`));
  }
}

async function findBaseSaleOrderForm(target) {
  const ids = await target.call("ir.ui.view", "search", [[["name", "=", "sale.order.form"], ["model", "=", "sale.order"], ["mode", "=", "primary"]]]);
  if (!ids.length) throw new Error("No s'ha trobat la vista base sale.order.form a la BD principal.");
  return ids[0];
}

async function readNamedViews(client, names) {
  const ids = await client.call("ir.ui.view", "search", [[["name", "in", names], ["model", "=", "sale.order"]]]);
  const result = [];
  for (const id of ids) {
    const [full] = await client.call("ir.ui.view", "read", [[id], ["name", "model", "type", "mode", "priority", "active", "key", "arch_db"]]);
    result.push(full);
  }
  return result;
}

async function syncViews(source, target, report) {
  const sourceViews = await readNamedViews(source, QUOTE_VIEW_NAMES);
  const targetViews = await readNamedViews(target, QUOTE_VIEW_NAMES);
  const targetByName = new Map(targetViews.map((view) => [view.name, view]));
  const inheritId = await findBaseSaleOrderForm(target);

  for (const sourceView of sourceViews) {
    const values = {
      name: sourceView.name,
      model: sourceView.model,
      type: sourceView.type,
      mode: sourceView.mode,
      priority: sourceView.priority,
      active: sourceView.active,
      arch_db: sourceView.arch_db,
      inherit_id: inheritId,
    };
    if (sourceView.key) values.key = sourceView.key;
    const current = targetByName.get(sourceView.name);
    if (APPLY) {
      if (current) await target.write("ir.ui.view", [current.id], values);
      else await target.create("ir.ui.view", values);
    }
    report.views[current ? "updated" : "created"].push(sourceView.name);
  }
}

async function qwebView(client, key) {
  const ids = await client.call("ir.ui.view", "search", [[["key", "=", key]]]);
  if (!ids.length) return null;
  const [view] = await client.call("ir.ui.view", "read", [[ids[0]], ["name", "key", "type", "arch_db", "active", "priority"]]);
  return view;
}

async function syncReports(source, target, report) {
  const reportFields = ["name", "model", "report_name", "report_type", "binding_type", "paperformat_id"];
  const sourceIds = await source.call("ir.actions.report", "search", [[["report_name", "=like", "mnl_solutions.%"]]]);
  const targetIds = await target.call("ir.actions.report", "search", [[["report_name", "=like", "mnl_solutions.%"]]]);
  const sourceReports = sourceIds.length ? await source.call("ir.actions.report", "read", [sourceIds, reportFields]) : [];
  const targetReports = targetIds.length ? await target.call("ir.actions.report", "read", [targetIds, ["report_name"]]) : [];
  const targetByName = new Map(targetReports.map((item) => [item.report_name, item]));

  for (const sourceReport of sourceReports) {
    const template = await qwebView(source, sourceReport.report_name);
    if (!template) throw new Error(`Falta la plantilla QWeb de ${sourceReport.report_name} a proves.`);
    const targetTemplate = await qwebView(target, sourceReport.report_name);
    const templateValues = { name: template.name, key: template.key, type: "qweb", arch_db: template.arch_db, active: template.active, priority: template.priority };
    if (APPLY) {
      if (targetTemplate) await target.write("ir.ui.view", [targetTemplate.id], templateValues);
      else await target.create("ir.ui.view", templateValues);
    }

    const reportValues = {
      name: sourceReport.name,
      model: sourceReport.model,
      report_name: sourceReport.report_name,
      report_type: sourceReport.report_type,
      binding_type: sourceReport.binding_type,
    };
    if (sourceReport.paperformat_id) reportValues.paperformat_id = sourceReport.paperformat_id[0];
    const targetReport = targetByName.get(sourceReport.report_name);
    if (APPLY) {
      if (targetReport) await target.write("ir.actions.report", [targetReport.id], reportValues);
      else await target.create("ir.actions.report", reportValues);
    }
    report.reports[targetReport ? "updated" : "created"].push(sourceReport.name);
  }
}

async function readAutomations(client) {
  const ids = await client.call("base.automation", "search", [[]], { context: { active_test: false } });
  if (!ids.length) return [];
  const rows = await client.call("base.automation", "read", [
    ids,
    ["name", "model_id", "model_name", "trigger", "active", "filter_pre_domain", "previous_domain", "filter_domain", "on_change_field_ids", "trigger_field_ids", "action_server_ids"],
  ]);
  return rows.filter((item) => QUOTE_MODELS.has(item.model_name));
}

async function fieldIdMap(source, target, automations) {
  const sourceIds = [...new Set(automations.flatMap((item) => [...item.on_change_field_ids, ...item.trigger_field_ids]))];
  if (!sourceIds.length) return new Map();
  const sourceFields = await source.call("ir.model.fields", "read", [sourceIds, ["name", "model"]]);
  const targetFields = await target.searchRead("ir.model.fields", [["model", "in", [...QUOTE_MODELS]]], ["name", "model"]);
  const targetByKey = new Map(targetFields.map((field) => [`${field.model}:${field.name}`, field.id]));
  return new Map(sourceFields.map((field) => [field.id, targetByKey.get(`${field.model}:${field.name}`)]));
}

async function syncAutomations(source, target, report) {
  const sourceAutomations = await readAutomations(source);
  const targetAutomations = await readAutomations(target);
  const targetByName = new Map(targetAutomations.map((item) => [item.name, item]));
  const sourceModelIds = new Map((await source.searchRead("ir.model", [["model", "in", [...QUOTE_MODELS]]], ["model"])).map((item) => [item.id, item.model]));
  const targetModelIds = await modelIds(target);
  const sourceActionIds = [...new Set(sourceAutomations.flatMap((item) => item.action_server_ids))];
  const sourceActions = sourceActionIds.length
    ? await source.call("ir.actions.server", "read", [sourceActionIds, ["name", "model_id", "state", "code", "sequence", "usage"]])
    : [];
  const actionById = new Map(sourceActions.map((item) => [item.id, item]));
  const fieldMap = await fieldIdMap(source, target, sourceAutomations);

  for (const automation of sourceAutomations) {
    const current = targetByName.get(automation.name);
    if (current) {
      if (APPLY) await target.write("base.automation", [current.id], { active: false });
      report.automations.updatedInactive.push(automation.name);
      continue;
    }
    const actionCommands = automation.action_server_ids.map((id) => {
      const action = actionById.get(id);
      if (!action) throw new Error(`Falta l'acció ${id} de l'automatització ${automation.name}.`);
      const modelName = sourceModelIds.get(action.model_id[0]);
      return [0, 0, { name: action.name, model_id: targetModelIds.get(modelName), state: action.state, code: action.code, sequence: action.sequence, usage: "base_automation" }];
    });
    const mapped = (ids) => ids.map((id) => fieldMap.get(id)).filter(Boolean);
    const values = {
      name: automation.name,
      model_id: targetModelIds.get(automation.model_name),
      trigger: automation.trigger,
      active: false,
      filter_pre_domain: automation.filter_pre_domain || false,
      previous_domain: automation.previous_domain || false,
      filter_domain: automation.filter_domain || false,
      on_change_field_ids: [[6, 0, mapped(automation.on_change_field_ids)]],
      trigger_field_ids: [[6, 0, mapped(automation.trigger_field_ids)]],
      action_server_ids: actionCommands,
    };
    if (APPLY) {
      await target.create("base.automation", values);
    }
    report.automations.createdInactive.push(automation.name);
  }

  if (APPLY) {
    const freshlySynced = await readAutomations(target);
    const byName = new Map(freshlySynced.map((item) => [item.name, item]));
    for (const automation of sourceAutomations) {
      await target.write("base.automation", [byName.get(automation.name).id], { active: true });
      report.automations.activated.push(automation.name);
    }
  }
}

async function createValidationQuote(target, report) {
  const existingIds = await target.call("sale.order", "search", [[["x_studio_referencia", "=", "TEST-MIGRACIO-CONFIG"]]]);
  if (existingIds.length) {
    const [existing] = await target.call("sale.order", "read", [[existingIds.at(-1)], ["name", "state"]]);
    report.validationQuote = { id: existing.id, name: existing.name, state: existing.state, reused: true };
    return;
  }
  const [partner] = await target.searchRead("res.partner", [["customer_rank", ">", 0]], ["name"], { limit: 1 });
  const [product] = await target.searchRead("product.product", [["sale_ok", "=", true]], ["display_name"], { limit: 1 });
  if (!partner || !product) throw new Error("No hi ha client i producte de venda disponibles per crear el pressupost de prova.");
  const values = {
    partner_id: partner.id,
    x_studio_referencia: "TEST-MIGRACIO-CONFIG",
    x_studio_revisio: "A",
    x_studio_validesa_dies: 10,
    x_studio_idioma_document: "ca_ES",
    order_line: [[0, 0, { product_id: product.id, product_uom_qty: 1, x_studio_uds: 1, x_studio_long: 2, x_studio_ancho_1: 1 }]],
  };
  const id = await target.create("sale.order", values);
  const [quote] = await target.call("sale.order", "read", [[id], ["name", "state", "x_studio_referencia", "x_studio_revisio", "x_studio_validesa_dies", "x_studio_total_mnl", "order_line"]]);
  const [line] = await target.call("sale.order.line", "read", [[quote.order_line[0]], ["x_studio_uds", "x_studio_long", "x_studio_ancho_1", "x_studio_cantidad", "x_studio_total", "x_studio_importe_mnl"]]);
  report.validationQuote = { id, name: quote.name, state: quote.state, reference: quote.x_studio_referencia, revision: quote.x_studio_revisio, validityDays: quote.x_studio_validesa_dies, totalMnl: quote.x_studio_total_mnl, line };
}

async function main() {
  const source = clientFor(SOURCE_FILE);
  const target = clientFor(TARGET_FILE);
  await Promise.all([source.authenticate(), target.authenticate()]);
  const report = {
    mode: APPLY ? "apply" : "dry-run",
    fields: { created: [], updated: [], deferred: new Map() },
    views: { created: [], updated: [] },
    reports: { created: [], updated: [] },
    automations: { createdInactive: [], updatedInactive: [], activated: [] },
    errors: [],
  };
  await syncFields(source, target, report);
  await syncViews(source, target, report);
  await syncReports(source, target, report);
  await syncAutomations(source, target, report);
  if (APPLY) await createValidationQuote(target, report);
  report.fields.deferred = Object.fromEntries(report.fields.deferred);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
