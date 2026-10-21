// Presentation only: preserve product identity, technical fields and pricing.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { requireConfig } from '../src/config.js';
import { OdooClient } from '../src/odooClient.js';
const cfg = requireConfig(); cfg.url = new URL(cfg.url).origin;
if (!process.env.ODOO_ENV_FILE || !/^provesmnl\d+$/.test(cfg.database)) throw new Error('Selecciona explícitament proves.');
const cl = new OdooClient({ ...cfg, fetchImpl: (u, o) => fetch(u, { ...o, signal: AbortSignal.timeout(45000) }) });
const name = 'MNL - etiquetes de transport';
const labels = { ca_ES: 'Transport', es_ES: 'Transporte', en_US: 'Transport' };
if (process.argv.includes('--rollback')) {
  const b = JSON.parse(readFileSync(process.argv[process.argv.indexOf('--rollback') + 1], 'utf8'));
  if (b.database !== cfg.database) throw new Error('Backup d’una altra base.');
  for (const [lang, name] of Object.entries(b.productNames)) await cl.call('product.template', 'write', [[b.templateId], { name }], { context: { lang } });
  if (b.view) { const { id, ...v } = b.view; v.inherit_id = v.inherit_id[0]; await cl.write('ir.ui.view', [id], v); }
  else if (b.createdView) await cl.write('ir.ui.view', [b.createdView], { active: false });
  console.log(JSON.stringify({ database: cfg.database, rolledBack: true })); process.exit(0);
}
const [product] = await cl.searchRead('product.product', [['default_code', '=', 'MNL-PORTES']], ['product_tmpl_id']);
if (!product) throw new Error('Falta el producte intern de transport.');
const [base] = await cl.searchRead('ir.model.data', [['module', '=', 'sale'], ['name', '=', 'view_order_form']], ['res_id']);
const [view] = await cl.searchRead('ir.ui.view', [['name', '=', name]], ['name', 'model', 'inherit_id', 'arch_db', 'active', 'priority'], { context: { active_test: false } });
const productNames = {};
for (const lang of Object.keys(labels)) {
  const [row] = await cl.searchRead('product.template', [['id', '=', product.product_tmpl_id[0]]], ['name'], { context: { lang } });
  productNames[lang] = row.name;
}
if (!process.argv.includes('--apply')) {
  console.log(JSON.stringify({ database: cfg.database, mode: 'preview', productNames, proposedNames: labels, pricingChanged: false })); process.exit(0);
}
mkdirSync('logs', { recursive: true });
const backupPath = resolve('logs', `odoo-transport-labels-${cfg.database}-${Date.now()}.json`);
const b = { database: cfg.database, templateId: product.product_tmpl_id[0], productNames, view, createdView: null };
const save = () => writeFileSync(backupPath, JSON.stringify(b, null, 2)); save();
for (const [lang, name] of Object.entries(labels)) await cl.call('product.template', 'write', [[b.templateId], { name }], { context: { lang } });
const values = { name, model: 'sale.order', inherit_id: base.res_id, priority: 1300, active: true,
  arch_db: readFileSync(new URL('../templates/quotation_transport_labels.xml', import.meta.url), 'utf8') };
if (view) await cl.write('ir.ui.view', [view.id], values);
else { b.createdView = await cl.create('ir.ui.view', values); save(); }
const result = await cl.call('sale.order', 'get_view', [], { view_type: 'form' });
if (!result.arch.includes('Configuració de transport')) throw new Error('Falta l’etiqueta nova a la vista combinada.');
console.log(JSON.stringify({ database: cfg.database, applied: true, backupPath })); process.exit(0);
