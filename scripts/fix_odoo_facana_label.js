import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { requireConfig } from '../src/config.js';
import { OdooClient } from '../src/odooClient.js';
const c = requireConfig(); c.url = new URL(c.url).origin;
if (!process.env.ODOO_ENV_FILE || !/^provesmnl\d+$/.test(c.database)) throw Error('Selecciona proves explícitament.');
const api = new OdooClient({ ...c, fetchImpl: (u,o) => fetch(u,{...o,signal:AbortSignal.timeout(30000)}) });
const categories = (await api.searchRead('product.category', [['name','ilike','facana']], ['name'])).filter(r => r.name.toLowerCase() === 'facana');
const orders = await api.searchRead('sale.order', [['state','in',['draft','sent']], ['x_mnl_frozen','=',false]], ['amount_total']);
const lines = await api.searchRead('sale.order.line', [['order_id','in',orders.map(o=>o.id)], '|', ['name','ilike','FACANA'], ['x_studio_familia','ilike','FACANA']], ['name','display_type','x_studio_familia']);
if (!process.argv.includes('--apply')) { console.log(JSON.stringify({preview:true,categories:categories.length,lines:lines.length})); process.exit(0); }
mkdirSync('logs',{recursive:true});
writeFileSync(`logs/facana-label-${Date.now()}.json`,JSON.stringify({database:c.database,categories,orders,lines},null,2));
for (const r of categories) await api.write('product.category',[r.id],{name:r.name.replace(/facana/i,'Façana')});
for (const r of lines) {
  const values = {};
  if (r.display_type === 'line_section' && r.name.includes('FACANA')) values.name = r.name.replaceAll('FACANA','FAÇANA');
  if (typeof r.x_studio_familia === 'string' && r.x_studio_familia.includes('FACANA')) values.x_studio_familia = r.x_studio_familia.replaceAll('FACANA','FAÇANA');
  if (Object.keys(values).length) await api.call('sale.order.line','write',[[r.id],values],{context:{mnl_section_sync:true}});
}
const after = await api.searchRead('sale.order',[['id','in',orders.map(o=>o.id)]],['amount_total']);
for (const o of orders) assert.equal(after.find(r=>r.id===o.id).amount_total,o.amount_total);
const remaining = await api.searchRead('sale.order.line',[['order_id','in',orders.map(o=>o.id)],'|','&',['display_type','=','line_section'],['name','like','FACANA'],['x_studio_familia','like','FACANA']],['id']);
assert.equal(remaining.length,0);
console.log(JSON.stringify({applied:true,categories:categories.length,checkedLines:lines.length,totalsUnchanged:true,frozenOrdersUntouched:true})); process.exit(0);
