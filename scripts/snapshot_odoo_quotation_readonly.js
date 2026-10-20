import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { requireConfig } from '../src/config.js';
import { OdooClient } from '../src/odooClient.js';

const config = requireConfig();
config.url = new URL(config.url).origin;
if (!process.env.ODOO_ENV_FILE || !/^provesmnl\d+$/.test(config.database)) {
  throw new Error('Selecciona explícitament una base de proves amb ODOO_ENV_FILE.');
}
const orderId = Number(process.argv[2]);
if (!Number.isSafeInteger(orderId) || orderId <= 0) throw new Error('Indica un ID de pressupost vàlid.');
const client = new OdooClient({ ...config, fetchImpl: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(45000) }) });
const orderDefinitions = await client.fieldsGet('sale.order', []);
const lineDefinitions = await client.fieldsGet('sale.order.line', []);
const customFields = definitions => Object.keys(definitions).filter(name => name.startsWith('x_'));
const [order] = await client.searchRead('sale.order', [['id', '=', orderId]], [
  'name', 'state', 'write_date', 'partner_id', 'partner_invoice_id', 'payment_term_id',
  'date_order', 'validity_date', 'amount_untaxed', 'amount_tax', 'amount_total', 'company_id', ...customFields(orderDefinitions),
]);
if (!order) throw new Error('El pressupost no existeix o no és accessible.');
const lineFields = ['sequence', 'display_type', 'name', 'product_id', 'product_uom_id', 'product_uom_qty',
  'price_unit', 'price_subtotal', 'price_total', 'discount', 'tax_ids', ...customFields(lineDefinitions)];
const ids = await client.call('sale.order.line', 'search', [[['order_id', '=', orderId]]], { order: 'sequence,id' });
const lines = await client.call('sale.order.line', 'read', [ids, lineFields]);
const directory = resolve('outputs/quotation-bench');
mkdirSync(directory, { recursive: true });
const path = join(directory, `quotation-${orderId}-${Date.now()}.json`);
writeFileSync(path, JSON.stringify({ database: config.database, at: new Date().toISOString(), order, lines }, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ database: config.database, orderId, lines: lines.length, snapshot: path, readOnly: true }));
