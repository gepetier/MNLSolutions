import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { requireConfig } from '../src/config.js';
import { OdooClient } from '../src/odooClient.js';
const cfg = requireConfig(); cfg.url = new URL(cfg.url).origin;
if (!process.env.ODOO_ENV_FILE || !/^provesmnl\d+$/.test(cfg.database)) throw new Error('Selecciona explícitament proves.');
const cl = new OdooClient({ ...cfg, fetchImpl: (u, o) => fetch(u, { ...o, signal: AbortSignal.timeout(120000) }) });
const prefix = 'MNL - flux acceptació i factura';
const read = (m, d, f) => cl.searchRead(m, d, f, { context: { active_test: false }, limit: 10000 });
const field = (name, label, type = 'char', relation = null) => ({ name, field_description: label, ttype: type,
  ...(relation ? { relation } : {}), state: 'manual', store: true, copied: false, readonly: true });
const definitions = {
  'sale.order': [field('x_mnl_frozen', 'Versió acceptada congelada', 'boolean'), field('x_mnl_issued_at', "Data d'emissió", 'datetime'),
    field('x_mnl_confirmed_at', 'Data de confirmació', 'datetime'), field('x_mnl_accepted_ref', 'Referència acceptada'),
    field('x_mnl_accepted_revision', 'Revisió acceptada'), field('x_mnl_accepted_customer', 'Client acceptat', 'text'),
    field('x_mnl_accepted_contact', 'Contacte acceptat'), field('x_mnl_accepted_language', 'Idioma acceptat'),
    field('x_mnl_accepted_snapshot', 'Dades comercials acceptades', 'text'), field('x_mnl_accepted_document_id', 'PDF del pressupost acceptat', 'many2one', 'ir.attachment')],
  'sale.order.line': [field('x_mnl_accepted_article', 'Article acceptat'), field('x_mnl_accepted_class', 'Classificador acceptat'),
    field('x_mnl_accepted_units', 'Unitats acceptades', 'float'), field('x_mnl_accepted_length', 'Longitud acceptada', 'float'),
    field('x_mnl_accepted_width', 'Amplada acceptada', 'float'), field('x_mnl_accepted_kind', 'Càlcul acceptat'),
    field('x_mnl_accepted_qty', 'Quantitat acceptada', 'float'), field('x_mnl_accepted_price', 'Preu acceptat', 'float'),
    field('x_mnl_accepted_net', 'Import acceptat sense IVA', 'float')],
  'account.move': [field('x_mnl_source_order_ids', "Comandes d'origen", 'many2many', 'sale.order'),
    field('x_mnl_source_summary', 'Versions acceptades', 'text'), field('x_mnl_customer_block', 'Client acceptat', 'text'),
    field('x_mnl_contact', 'Contactes', 'text'), field('x_mnl_document_language', 'Idioma del document'), field('x_mnl_source_conditions', 'Condicions acceptades dels pressupostos', 'text')],
  'account.move.line': [field('x_mnl_source_line_id', 'Línia de comanda acceptada', 'many2one', 'sale.order.line'),
    field('x_mnl_source_ref', 'Referència acceptada'), field('x_mnl_source_revision', 'Revisió acceptada'),
    field('x_mnl_article', 'Article acceptat'), field('x_mnl_class', 'Classificador'), field('x_mnl_units', 'Unitats', 'float'),
    field('x_mnl_length', 'Longitud (m)', 'float'), field('x_mnl_width', 'Amplada (m)', 'float'), field('x_mnl_kind', 'Unitat de càlcul')],
};
const models = await read('ir.model', [['model', 'in', [...Object.keys(definitions), 'ir.attachment']]], ['model']);
const allFields = await read('ir.model.fields', [['model', 'in', Object.keys(definitions)]], ['model', 'name', 'ttype']);
const actions = await read('ir.actions.server', [['name', '=like', prefix + '%']], ['name', 'model_id', 'state', 'code']);
const automations = await read('base.automation', [['name', '=like', prefix + '%']], ['name', 'model_id', 'trigger', 'active', 'action_server_ids', 'trigger_field_ids', 'on_change_field_ids']);
const views = await read('ir.ui.view', ['|', ['name', '=like', prefix + '%'], ['name', 'in', ['MNL - pressupost estàndard predeterminat', 'MNL - portal de pressupost unificat', 'MNL Pressupost estàndard - document']]], ['name', 'model', 'type', 'key', 'arch_db', 'inherit_id', 'priority', 'active']);
const reports = await read('ir.actions.report', [['report_name', 'in', ['mnl_solutions.report_invoice_standard', 'mnl_solutions.report_quotation_standard', 'account.report_invoice_with_payments_copy_1']]], ['name', 'model', 'report_name', 'report_file', 'report_type', 'paperformat_id', 'binding_model_id', 'binding_type', 'print_report_name']);
if (process.argv.includes('--rollback')) {
  const b = JSON.parse(readFileSync(process.argv[process.argv.indexOf('--rollback') + 1], 'utf8'));
  if (b.database !== cfg.database) throw new Error('Backup d’una altra base.');
  const frozen = await cl.searchRead('sale.order', [['x_mnl_frozen', '=', true]], ['id'], { limit: 1 });
  if (frozen.length) throw new Error('Hi ha versions acceptades congelades. Cal una reversió que preservi aquests documents; no desactivaré les proteccions.');
  for (const id of b.createdAutomations) await cl.write('base.automation', [id], { active: false });
  for (const a of b.automations) { const { id, ...v } = a; v.model_id = v.model_id[0]; for (const k of ['action_server_ids', 'trigger_field_ids', 'on_change_field_ids']) v[k] = [[6, 0, v[k]]]; await cl.write('base.automation', [id], v); }
  for (const a of b.actions) { const { id, ...v } = a; v.model_id = v.model_id[0]; await cl.write('ir.actions.server', [id], v); }
  for (const v of b.views) { const { id, ...x } = v; x.inherit_id = x.inherit_id?.[0] || false; await cl.write('ir.ui.view', [id], x); }
  for (const id of b.createdViews) await cl.write('ir.ui.view', [id], { active: false });
  for (const r of b.reports) { const { id, ...v } = r; v.paperformat_id = v.paperformat_id?.[0] || false; v.binding_model_id = v.binding_model_id?.[0] || false; await cl.write('ir.actions.report', [id], v); }
  for (const id of b.createdReports) await cl.write('ir.actions.report', [id], { binding_model_id: false });
  console.log(JSON.stringify({ rolledBack: true, database: cfg.database, retainedFields: true })); process.exit(0);
}
if (!process.argv.includes('--apply')) { console.log(JSON.stringify({ mode: 'preview', database: cfg.database, fields: Object.fromEntries(Object.entries(definitions).map(([m, f]) => [m, f.map(x => x.name)])), freezeAccepted: true, invoiceMode: 'total draft; manual posting', traceability: 'native lines + accepted version + frozen PDF' })); process.exit(0); }
mkdirSync('logs', { recursive: true });
const backupPath = resolve('logs', `odoo-sales-flow-${cfg.database}-${Date.now()}.json`);
const b = { database: cfg.database, views, actions, automations, reports, createdFields: [], createdViews: [], createdReports: [], createdActions: [], createdAutomations: [] };
const save = () => writeFileSync(backupPath, JSON.stringify(b, null, 2)); save();
const [token] = await read('ir.config_parameter', [['key', '=', 'mnl.sales_flow_internal_token']], ['id']);
if (!token) await cl.create('ir.config_parameter', { key: 'mnl.sales_flow_internal_token', value: randomUUID() });
for (const [model, fields] of Object.entries(definitions)) {
  for (const f of fields) {
    const old = allFields.find(x => x.model === model && x.name === f.name);
    if (old && old.ttype !== f.ttype) throw new Error('Tipus incompatible: ' + f.name);
    if (!old) { const id = await cl.create('ir.model.fields', { ...f, model_id: models.find(x => x.model === model).id }); b.createdFields.push(id); save(); }
  }
}
// The quotation installer has its own backup; this backup also retains its prior views.
if (!process.argv.includes('--activate')) process.argv.push('--activate');
await import('./install_odoo_standard_quotation.js');
async function upsertView(name, model, source, inheritId = false, key = false) {
  const old = await read('ir.ui.view', [['name', '=', name]], ['id']);
  const values = { name, model: model || false, type: model ? 'form' : 'qweb', arch_db: source, inherit_id: inheritId, priority: 1500, active: true, key: key || (model ? false : 'mnl_solutions.sales_flow_native_invoice') };
  if (old.length) { await cl.write('ir.ui.view', [old[0].id], values); return old[0].id; }
  const id = await cl.create('ir.ui.view', values); b.createdViews.push(id); save(); return id;
}
await import('./install_odoo_invoice_layout.js');
const ref = async (module, name) => (await read('ir.model.data', [['module', '=', module], ['name', '=', name]], ['res_id']))[0].res_id;
for (const [model, file, module, name] of [['sale.order', 'sales_flow_order_form.xml', 'sale', 'view_order_form'], ['account.move', 'sales_flow_invoice_form.xml', 'account', 'view_move_form']]) {
  await upsertView(prefix + ' ' + model, model, readFileSync(new URL('../templates/' + file, import.meta.url), 'utf8'), await ref(module, name));
}
const invoiceDoc = 'mnl_solutions.report_invoice_standard_document';
const invoiceReport = 'mnl_solutions.report_invoice_standard';
await upsertView(prefix + ' document factura', null, readFileSync(new URL('../templates/invoice_standard.xml', import.meta.url), 'utf8'), false, invoiceDoc);
await upsertView(prefix + ' informe factura', null, `<t t-name="${invoiceReport}"><t t-call="web.html_container"><t t-foreach="docs" t-as="doc"><t t-call="${invoiceDoc}"/></t></t></t>`, false, invoiceReport);
const nativeOverride = `<data><xpath expr="//t[@t-call='web.external_layout']" position="before"><t t-if="o.x_mnl_source_order_ids"><t t-set="doc" t-value="o"/><t t-call="${invoiceDoc}"/></t></xpath><xpath expr="//t[@t-call='web.external_layout']" position="attributes"><attribute name="t-if">not o.x_mnl_source_order_ids</attribute></xpath></data>`;
await upsertView(prefix + ' factura nativa', null, nativeOverride, await ref('account', 'report_invoice_document'));
const [paper] = await read('report.paperformat', [['name', '=', 'MNL Pressupost A4 vertical']], ['id']);
const reportValues = { name: 'Factura MNL', model: 'account.move', report_name: invoiceReport, report_file: invoiceReport,
  report_type: 'qweb-pdf', paperformat_id: paper.id, binding_model_id: models.find(x => x.model === 'account.move').id,
  binding_type: 'report', print_report_name: "'Factura - %s' % (object.name or 'Esborrany')" };
const oldReport = reports.find(x => x.report_name === invoiceReport);
if (oldReport) await cl.write('ir.actions.report', [oldReport.id], reportValues);
else { b.createdReports.push(await cl.create('ir.actions.report', reportValues)); save(); }
for (const r of reports.filter(x => x.report_name === 'account.report_invoice_with_payments_copy_1')) await cl.write('ir.actions.report', [r.id], { binding_model_id: false });
const currentFields = await read('ir.model.fields', [['model', 'in', Object.keys(definitions)]], ['model', 'name']);
const orderCommercial = ['state', 'locked', 'name', 'partner_id', 'partner_invoice_id', 'partner_shipping_id', 'payment_term_id', 'currency_id', 'pricelist_id', 'fiscal_position_id', 'date_order', 'validity_date', 'note', 'signature', 'signed_by', 'signed_on'];
const lineCommercial = ['order_id', 'product_id', 'product_uom_id', 'product_uom_qty', 'price_unit', 'discount', 'tax_ids', 'display_type', 'name', 'sequence'];
const rules = [
  [' protegir PDF acceptat', 'ir.attachment', 'on_create_or_write', 'sales_flow_attachment_guard.py', []],
  [' impedir eliminar PDF acceptat', 'ir.attachment', 'on_unlink', 'sales_flow_attachment_guard.py', []],
  [' acceptar i protegir comanda', 'sale.order', 'on_create_or_write', 'sales_flow_order.py', orderCommercial.concat(currentFields.filter(x => x.model === 'sale.order' && x.name.startsWith('x_')).map(x => x.name))],
  [' protegir línies acceptades', 'sale.order.line', 'on_create_or_write', 'sales_flow_line_guard.py', lineCommercial.concat(currentFields.filter(x => x.model === 'sale.order.line' && x.name.startsWith('x_')).map(x => x.name))],
  [' impedir eliminar línies acceptades', 'sale.order.line', 'on_unlink', 'sales_flow_line_guard.py', []],
  [' copiar línies de factura', 'account.move.line', 'on_create_or_write', 'sales_flow_invoice_line.py', ['move_id', 'sale_line_ids', 'product_id', 'product_uom_id', 'quantity', 'price_unit', 'discount', 'tax_ids', ...definitions['account.move.line'].map(x => x.name)]],
  [' vincular factura i versions', 'account.move', 'on_create_or_write', 'sales_flow_invoice.py', ['state', 'partner_id', 'currency_id', 'invoice_payment_term_id', 'invoice_line_ids', ...definitions['account.move'].map(x => x.name)]],
];
for (const [suffix, model, trigger, file, watched] of rules) {
  const name = prefix + suffix;
  const av = { name, model_id: models.find(x => x.model === model).id, state: 'code', code: readFileSync(new URL('./assets/' + file, import.meta.url), 'utf8') };
  const old = actions.find(x => x.name === name); let id = old?.id;
  if (id) await cl.write('ir.actions.server', [id], av);
  else { id = await cl.create('ir.actions.server', av); b.createdActions.push(id); save(); }
  const values = { name, model_id: av.model_id, active: true, trigger, action_server_ids: [[6, 0, [id]]],
    trigger_field_ids: [[6, 0, currentFields.filter(x => x.model === model && watched.includes(x.name)).map(x => x.id)]] };
  const existing = automations.find(x => x.name === name);
  if (existing) await cl.write('base.automation', [existing.id], values);
  else { b.createdAutomations.push(await cl.create('base.automation', values)); save(); }
}
// Backfill only dates on open quotations; do not confirm historical records.
for (const order of await read('sale.order', [['state', 'in', ['draft', 'sent']], ['x_mnl_issued_at', '=', false]], ['date_order'])) {
  await cl.call('sale.order', 'write', [[order.id], { x_mnl_issued_at: order.date_order }], { context: { mnl_flow_internal: true } });
}
console.log(JSON.stringify({ database: cfg.database, applied: true, backupPath, newFields: b.createdFields.length, newAutomations: b.createdAutomations.length, invoicesPosted: 0 }));
process.exit(0);
