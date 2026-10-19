import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { requireConfig } from '../src/config.js';
import { OdooClient } from '../src/odooClient.js';

const config = requireConfig();
config.url = new URL(config.url).origin;
if (!process.env.ODOO_ENV_FILE || !/^provesmnl\d+$/.test(config.database)) {
  throw new Error('Cal seleccionar explicitament una base de proves amb ODOO_ENV_FILE.');
}
const client = new OdooClient({ ...config, fetchImpl: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(45000) }) });
const prefix = 'MNL - Heretar client en canviar pressupost';
const viewName = 'MNL - dades de client en directe';
const fieldSpecs = [
  ['name', 'Nom fiscal', 'char'], ['street', 'Adreça fiscal', 'char'], ['street2', 'Adreça (continuació)', 'char'],
  ['zip', 'Codi postal', 'char'], ['city', 'Població', 'char'], ['vat', 'NIF/CIF', 'char'],
  ['phone', 'Telèfon', 'char'], ['email', 'Correu electrònic', 'char'], ['country_id', 'País', 'many2one', 'res.country'], ['commercial_partner_id', 'Client fiscal', 'many2one', 'res.partner'],
].map(([source, label, type, relation]) => ({ name: `x_mnl_customer_${source}`, field_description: label, ttype: type,
  ...(relation ? { relation } : {}), state: 'manual', readonly: true, store: false, copied: false,
  related: `partner_id.commercial_partner_id.${source}` }));

// Only runs for a customer change: subsequent manual overrides remain editable.
const body = `partner = order.partner_id
values = {'x_studio_contacte_pressupost_id': False}
if partner:
    fiscal = partner.commercial_partner_id
    if partner != fiscal and not partner.is_company and partner.type == 'contact':
        values['x_studio_contacte_pressupost_id'] = partner.id
    language = partner.lang or fiscal.lang
    values['x_studio_idioma_document'] = language if language in ['ca_ES', 'es_ES', 'en_US'] else 'es_ES'
    term = partner.property_payment_term_id or fiscal.property_payment_term_id
    allowed = ['Transferència Bancaria', 'Transferència bancària', 'Transferencia bancaria', 'Rebut bancari 30 dies', 'Confirming 60 dies']
    if not term or term.with_context(lang='en_US').name not in allowed:
        term = env['account.payment.term'].with_context(lang='en_US').search([('name', 'in', allowed[:3])], order='id', limit=1)
    values['payment_term_id'] = term.id or False
else:
    values['x_studio_idioma_document'] = False
    values['payment_term_id'] = False
`;
const uiCode = `values = {}\nfor order in (record and [record]) or records or []:\n    if order.state in ['draft', 'sent']:\n${body.split('\n').map(l => '        ' + l).join('\n')}\naction = {'value': values}\n`;
const persistCode = `for order in records:\n    if order.state in ['draft', 'sent'] and not env.context.get('mnl_customer_sync_skip'):\n${body.split('\n').map(l => '        ' + l).join('\n')}\n        # Keep explicitly supplied values on create/API writes. UI customer changes\n        # have already returned the correct values, and later edits do not trigger this rule.\n        if env.context.get('old_values') is None:\n            values = {}\n        if values:\n            order.with_context(mnl_customer_sync_skip=True).write(values)\n`;
const xml = `<data>
  <xpath expr="//group[@name='partner_details']/field[@name='partner_id']" position="after">
    <field name="x_mnl_customer_commercial_partner_id" invisible="1"/>
    <field name="x_mnl_customer_name" readonly="1"/>
    <field name="x_mnl_customer_street" readonly="1"/>
    <field name="x_mnl_customer_street2" readonly="1"/>
    <field name="x_mnl_customer_zip" readonly="1"/>
    <field name="x_mnl_customer_city" readonly="1"/>
    <field name="x_mnl_customer_country_id" readonly="1" options="{'no_open': True, 'no_create': True}"/>
    <field name="x_mnl_customer_vat" readonly="1"/>
    <field name="x_mnl_customer_phone" readonly="1"/>
    <field name="x_mnl_customer_email" readonly="1"/>
    <field name="x_studio_contacte_pressupost_id" string="Persona de contacte" domain="[('commercial_partner_id', '=', x_mnl_customer_commercial_partner_id)]" options="{'no_create': True}" readonly="state not in ['draft', 'sent']"/>
  </xpath>
</data>`;

await client.authenticate();
async function read(model, domain, fields) { return client.searchRead(model, domain, fields, { context: { active_test: false }, limit: 1000 }); }
if (process.argv.includes('--rollback')) {
  const p = process.argv[process.argv.indexOf('--rollback') + 1];
  const backup = JSON.parse(readFileSync(p, 'utf8'));
  if (backup.database !== config.database) throw new Error('El backup correspon a una altra base.');
  for (const a of backup.createdAutomations || []) await client.write('base.automation', [a], { active: false });
  for (const v of backup.createdViews || []) await client.write('ir.ui.view', [v], { active: false });
  for (const a of backup.automations) { const { id, ...v } = a; await client.write('base.automation', [id], v); }
  for (const a of backup.actions) { const { id, ...v } = a; await client.write('ir.actions.server', [id], v); }
  for (const a of backup.views) { const { id, ...v } = a; await client.write('ir.ui.view', [id], v); }
  console.log(JSON.stringify({ rolledBack: true, database: config.database, note: 'Els camps relacionats nous es conserven, sense vista ni automatitzacions actives.' }));
  process.exit(0);
}
const [model] = await read('ir.model', [['model', '=', 'sale.order']], ['id']);
const [partnerField] = await read('ir.model.fields', [['model', '=', 'sale.order'], ['name', '=', 'partner_id']], ['id']);
const [baseViewRef] = await read('ir.model.data', [['module', '=', 'sale'], ['name', '=', 'view_order_form']], ['res_id']);
const baseView = baseViewRef && { id: baseViewRef.res_id };
const backup = { database: config.database, auditedAt: new Date().toISOString(),
  fields: await read('ir.model.fields', [['model', '=', 'sale.order'], ['name', 'in', fieldSpecs.map(f => f.name)]], ['name', 'related', 'readonly', 'store', 'ttype']),
  actions: await read('ir.actions.server', [['name', 'in', [prefix + ' UI', prefix + ' persistència']]], ['name', 'code', 'model_id', 'state']),
  automations: await read('base.automation', [['name', 'in', [prefix + ' UI', prefix + ' persistència']]], ['name', 'active', 'trigger', 'model_id', 'on_change_field_ids', 'trigger_field_ids', 'action_server_ids']),
  views: await read('ir.ui.view', [['name', '=', viewName]], ['name', 'arch_db', 'active', 'inherit_id', 'priority', 'model']),
  createdFields: [], createdActions: [], createdAutomations: [], createdViews: [] };
if (!model || !partnerField || !baseView) throw new Error('Falten models/camps/vista base esperats.');
if (!process.argv.includes('--apply')) {
  console.log(JSON.stringify({ database: config.database, mode: 'preview', newFields: fieldSpecs.filter(f => !backup.fields.some(old => old.name === f.name)).map(f => f.name), actions: [prefix + ' UI', prefix + ' persistència'], view: viewName }));
  process.exit(0);
}
mkdirSync('logs', { recursive: true });
const backupPath = resolve('logs', `odoo-customer-onchange-${config.database}-${Date.now()}.json`);
const save = () => writeFileSync(backupPath, JSON.stringify(backup, null, 2)); save();
for (const f of fieldSpecs) {
  const old = backup.fields.find(old => old.name === f.name);
  if (old) {
    if (old.related !== f.related || old.ttype !== f.ttype || old.store || !old.readonly) throw new Error(`Camp existent incompatible: ${f.name}`);
  } else { backup.createdFields.push(await client.create('ir.model.fields', { ...f, model_id: model.id })); save(); }
}
for (const [suffix, code, trigger] of [[' UI', uiCode, 'on_change'], [' persistència', persistCode, 'on_create_or_write']]) {
  const name = prefix + suffix;
  const a = backup.actions.find(a => a.name === name);
  const av = { name, model_id: model.id, state: 'code', code };
  const actionId = a ? a.id : await client.create('ir.actions.server', av);
  if (a) await client.write('ir.actions.server', [a.id], av); else { backup.createdActions.push(actionId); save(); }
  const old = backup.automations.find(a => a.name === name);
  const v = { name, active: true, model_id: model.id, trigger, trigger_field_ids: [[6, 0, [partnerField.id]]], action_server_ids: [[6, 0, [actionId]]] };
  if (trigger === 'on_change') v.on_change_field_ids = [[6, 0, [partnerField.id]]];
  if (old) await client.write('base.automation', [old.id], v);
  else { backup.createdAutomations.push(await client.create('base.automation', v)); save(); }
}
const v = { name: viewName, model: 'sale.order', inherit_id: baseView.id, arch_db: xml, priority: 110, active: true };
if (backup.views[0]) await client.write('ir.ui.view', [backup.views[0].id], v);
else { backup.createdViews.push(await client.create('ir.ui.view', v)); save(); }
console.log(JSON.stringify({ applied: true, database: config.database, backupPath, createdFields: backup.createdFields.length, createdAutomations: backup.createdAutomations, createdViews: backup.createdViews }));
