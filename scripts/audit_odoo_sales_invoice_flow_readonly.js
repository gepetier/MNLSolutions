// Read-only inventory; never confirms orders, creates invoices or posts moves.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { requireConfig } from '../src/config.js';
import { OdooClient } from '../src/odooClient.js';
const cfg = requireConfig(); cfg.url = new URL(cfg.url).origin;
if (!process.env.ODOO_ENV_FILE || !/^provesmnl\d+$/.test(cfg.database)) throw new Error('Selecciona explícitament proves.');
const cl = new OdooClient({ ...cfg, fetchImpl: (u, o) => fetch(u, { ...o, signal: AbortSignal.timeout(45000) }) });
await cl.authenticate();
const metadata = {};
for (const model of ['sale.order', 'sale.order.line', 'account.move', 'account.move.line', 'product.template', 'res.company']) metadata[model] = await cl.fieldsGet(model, []);
const read = (model, domain, wanted, limit = 10000, extra = {}) => cl.searchRead(model, domain,
  wanted.filter(f => !metadata[model] || metadata[model][f]), { limit, ...extra });
const jobs = {
  orders: () => read('sale.order', [], ['name', 'state', 'invoice_status', 'invoice_ids', 'invoice_count', 'partner_id', 'partner_invoice_id', 'partner_shipping_id', 'company_id', 'payment_term_id', 'currency_id', 'amount_untaxed', 'amount_tax', 'amount_total', 'require_signature', 'require_payment', 'locked', 'picking_ids', 'date_order', 'validity_date']),
  lines: () => read('sale.order.line', [], ['order_id', 'product_id', 'product_uom_id', 'product_uom_qty', 'qty_delivered', 'qty_invoiced', 'qty_to_invoice', 'invoice_status', 'invoice_lines', 'qty_delivered_method', 'display_type', 'price_unit', 'price_subtotal', 'price_total', 'tax_ids', 'x_studio_uds', 'x_studio_long', 'x_studio_ancho_1', 'x_studio_tipus_calcul']),
  invoices: () => read('account.move', [['move_type', 'in', ['out_invoice', 'out_refund']]], ['name', 'state', 'move_type', 'payment_state', 'invoice_origin', 'invoice_date', 'partner_id', 'invoice_payment_term_id', 'amount_untaxed', 'amount_tax', 'amount_total', 'invoice_line_ids', 'sale_order_count', 'reversed_entry_id', 'auto_post']),
  invoiceLines: () => read('account.move.line', [['move_id.move_type', 'in', ['out_invoice', 'out_refund']]], ['move_id', 'display_type', 'product_id', 'product_uom_id', 'quantity', 'price_unit', 'price_subtotal', 'sale_line_ids', ...Object.keys(metadata['account.move.line']).filter(f => f.startsWith('x_'))]),
  products: () => read('product.template', [['sale_ok', '=', true]], ['default_code', 'type', 'invoice_policy', 'service_type', 'service_tracking', 'is_storable', 'route_ids', 'uom_id', 'x_studio_tipus_calcul']),
  modules: () => read('ir.module.module', [['state', '=', 'installed'], ['name', 'in', ['sale', 'sale_management', 'sale_stock', 'stock', 'purchase', 'sale_purchase', 'account', 'account_accountant', 'l10n_es', 'sale_margin', 'sign', 'web_studio', 'sale_pdf_quote_builder']]], ['name', 'state']),
  automations: () => read('base.automation', [['active', '=', true], ['model_id.model', 'in', ['sale.order', 'sale.order.line', 'account.move', 'account.move.line']]], ['name', 'model_id', 'trigger', 'trigger_field_ids', 'on_change_field_ids', 'filter_domain', 'filter_pre_domain', 'action_server_ids']),
  reports: () => read('ir.actions.report', [['model', 'in', ['sale.order', 'account.move']]], ['name', 'model', 'report_name', 'binding_model_id', 'paperformat_id']),
  companies: () => read('res.company', [], ['country_id', 'account_fiscal_country_id', 'tax_calculation_rounding_method', 'sale_lock_confirmed_orders', 'account_sale_tax_id', 'account_purchase_tax_id']),
  views: () => read('ir.ui.view', [['active', '=', true], '|', ['key', 'like', 'mnl_solutions.'], ['name', 'ilike', 'MNL']], ['name', 'key', 'model', 'inherit_id', 'arch_db']),
};
const audit = { database: cfg.database, at: new Date().toISOString(), readOnly: true, errors: {}, metadata };
const result = await Promise.allSettled(Object.entries(jobs).map(async ([key, job]) => { audit[key] = await job(); }));
result.forEach((r, i) => { if (r.status === 'rejected') audit.errors[Object.keys(jobs)[i]] = r.reason.message; });
const actionIds = [...new Set((audit.automations || []).flatMap(a => a.action_server_ids))];
audit.actions = actionIds.length ? await read('ir.actions.server', [['id', 'in', actionIds]], ['name', 'model_id', 'code', 'state']) : [];
const output = resolve(process.env.MNL_FLOW_AUDIT_OUTPUT || 'outputs/sales-invoice-flow', `audit-${Date.now()}.json`);
mkdirSync(resolve(output, '..'), { recursive: true }); writeFileSync(output, JSON.stringify(audit, null, 2));
console.log(JSON.stringify({ database: cfg.database, at: audit.at, readOnly: true, output,
  counts: Object.fromEntries(Object.keys(jobs).map(k => [k, audit[k]?.length ?? null])), errors: audit.errors }));
process.exit(Object.keys(audit.errors).length ? 1 : 0);
