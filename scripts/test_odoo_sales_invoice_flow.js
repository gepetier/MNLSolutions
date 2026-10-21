// Integration test: creates clearly marked copies; never posts or sends invoices.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { requireConfig } from '../src/config.js';
import { OdooClient } from '../src/odooClient.js';
const cfg = requireConfig(); cfg.url = new URL(cfg.url).origin;
if (!process.argv.includes('--apply') || !process.env.ODOO_ENV_FILE || !/^provesmnl\d+$/.test(cfg.database)) throw new Error('Prova amb escriptures: selecciona proves i --apply.');
const sourceId = Number(process.argv[2]); if (!Number.isSafeInteger(sourceId) || sourceId < 1) throw new Error('Indica el pressupost fictici de partida.');
const cl = new OdooClient({ ...cfg, fetchImpl: (u, o) => fetch(u, { ...o, signal: AbortSignal.timeout(120000) }) });
const read = (m, d, f) => cl.searchRead(m, d, f, { limit: 5000 });
const [original] = await read('sale.order', [['id', '=', sourceId]], ['state', 'name', 'amount_total', 'partner_id', 'x_studio_condicions_acceptacio']);
if (original.state !== 'draft' || !original.x_studio_condicions_acceptacio.includes('SENSE VALIDESA COMERCIAL')) throw new Error('Només es permet partir d’un esborrany fictici marcat sense validesa comercial.');
const nativeNewName = (await cl.call('sale.order', 'default_get', [['name']])).name;
const stamp = Date.now(); const prefix = 'MNL-QA-FLOW-' + stamp;
const result = { database: cfg.database, sourceId, at: new Date().toISOString(), orders: [], invoiceId: null, checks: [] };
mkdirSync('outputs/sales-invoice-flow', { recursive: true });
const output = `outputs/sales-invoice-flow/test-${stamp}.json`;
const save = () => writeFileSync(output, JSON.stringify(result, null, 2));
const check = name => { result.checks.push(name); save(); console.log(JSON.stringify({ passed: name })); };
const reject = async (name, task, pattern) => { let e; try { await task(); } catch (error) { e = error; } assert.ok(e, name + ': expected rejection'); if (pattern) assert.match(e.message, pattern); check(name); };
const copy = async suffix => { const ref = prefix + '-' + suffix; const copied = await cl.call('sale.order', 'copy', [[sourceId], { name: nativeNewName, x_studio_referencia: false, note: 'Prova automatitzada sense validesa comercial: ' + ref, x_studio_revisio: 'A', date_order: new Date().toISOString().slice(0, 10) + ' 00:00:00' }]); const id = Array.isArray(copied) ? copied[0] : copied; result.orders.push(id); save(); return id; };
try {
  const bad = await copy('INVALID');
  const [badLine] = await read('sale.order.line', [['order_id', '=', bad], ['display_type', '=', false], ['x_studio_tipus_calcul', '=', 'm2']], ['id']);
  await cl.write('sale.order.line', [badLine.id], { x_studio_long: 0 });
  await reject('incomplete_dimensions_block_confirmation', () => cl.call('sale.order', 'action_confirm', [[bad]]), /longitud|quantitat/i);
  const [badState] = await read('sale.order', [['id', '=', bad]], ['state', 'x_mnl_frozen']); assert.equal(badState.state, 'draft'); assert.equal(badState.x_mnl_frozen, false); check('failed_confirmation_is_atomic');
  const first = await copy('ONE'); const second = await copy('TWO');
  await cl.write('sale.order', [second], { x_studio_revisio: 'B' });
  await cl.call('sale.order', 'action_confirm', [[first, second]]);
  const orders = await read('sale.order', [['id', 'in', [first, second]]], ['state', 'locked', 'x_mnl_frozen', 'x_mnl_issued_at', 'x_mnl_confirmed_at', 'x_mnl_accepted_ref', 'x_mnl_accepted_revision', 'x_mnl_accepted_document_id', 'amount_total']);
  for (const order of orders) { assert.equal(order.state, 'sale'); assert.equal(order.locked, true); assert.equal(order.x_mnl_frozen, true); assert.ok(order.x_mnl_accepted_document_id); assert.ok(order.x_mnl_confirmed_at > order.x_mnl_issued_at); assert.equal(order.amount_total, original.amount_total); }
  assert.equal(orders.find(o => o.id === second).x_mnl_accepted_revision, 'B'); check('accepted_orders_locked_with_original_issue_date_and_pdf');
  // Start locked: a repeated write of False to an already unlocked record is a no-op.
  await reject('caller_boolean_cannot_bypass_freeze', () => cl.call('sale.order', 'write', [[first], { locked: false }], { context: { mnl_flow_internal: true } }), /congelad|bloquead/i);
  const acceptedPdf = orders.find(o => o.id === first).x_mnl_accepted_document_id[0];
  await reject('accepted_pdf_cannot_change', () => cl.call('ir.attachment', 'write', [[acceptedPdf], { name: 'ALTERED.pdf' }], { context: { mnl_flow_internal: true } }), /congelad/i);
  await reject('accepted_pdf_cannot_delete', () => cl.unlink('ir.attachment', [acceptedPdf]), /congelad/i);
  const revisionCopy = await cl.call('sale.order', 'copy', [[first], { name: nativeNewName, x_studio_referencia: orders.find(o => o.id === first).x_mnl_accepted_ref.replace(/-[A-Z]$/, ''), x_studio_revisio: 'B' }]);
  const revisionId = Array.isArray(revisionCopy) ? revisionCopy[0] : revisionCopy;
  result.orders.push(revisionId); save();
  const [revision] = await read('sale.order', [['id', '=', revisionId]], ['state', 'locked', 'x_mnl_frozen', 'x_mnl_accepted_document_id']);
  assert.equal(revision.state, 'draft'); assert.equal(revision.locked, false); assert.equal(revision.x_mnl_frozen, false); assert.equal(revision.x_mnl_accepted_document_id, false);
  const [revisionLine] = await read('sale.order.line', [['order_id', '=', revisionId], ['display_type', '=', false]], ['x_studio_long']);
  await cl.write('sale.order.line', [revisionLine.id], { x_studio_long: revisionLine.x_studio_long + 0.1 });
  check('accepted_copy_is_new_editable_draft');
  const [line] = await read('sale.order.line', [['order_id', '=', first], ['display_type', '=', false]], ['x_studio_long']);
  await reject('accepted_dimensions_cannot_change', () => cl.write('sale.order.line', [line.id], { x_studio_long: line.x_studio_long + 1 }), /congelad|bloquead|confirmad/i);
  await reject('accepted_reference_cannot_change', () => cl.write('sale.order', [first], { name: 'ALTERED' }), /congelad|bloquead|confirmad/i);
  await reject('accepted_order_cannot_unlock', () => cl.call('sale.order', 'action_unlock', [[first]]), /congelad|bloquead|confirmad/i);
  await reject('accepted_line_cannot_delete', () => cl.unlink('sale.order.line', [line.id]), /congelad|bloquead|confirmad/i);
  const wizard = await cl.call('sale.advance.payment.inv', 'create', [{ advance_payment_method: 'delivered', sale_order_ids: [[6, 0, [first, second]]], consolidated_billing: true }], { context: { active_model: 'sale.order', active_ids: [first, second] } });
  await cl.call('sale.advance.payment.inv', 'create_invoices', [[wizard]]);
  const invoices = await read('account.move', [['x_mnl_source_order_ids', 'in', [first, second]], ['move_type', '=', 'out_invoice']], ['state', 'amount_total', 'x_mnl_source_order_ids', 'x_mnl_source_summary', 'x_mnl_source_conditions']);
  assert.equal(invoices.length, 1); const invoice = invoices[0]; result.invoiceId = invoice.id; save();
  assert.equal(invoice.state, 'draft'); assert.equal(invoice.x_mnl_source_order_ids.length, 2); assert.ok(Math.abs(invoice.amount_total - original.amount_total * 2) <= 0.02);
  for (const o of orders) { assert.ok(invoice.x_mnl_source_summary.includes(o.x_mnl_accepted_ref)); assert.ok(invoice.x_mnl_source_conditions.includes(o.x_mnl_accepted_ref)); } check('two_accepted_versions_trace_to_one_draft_invoice');
  const invoiceLines = await read('account.move.line', [['move_id', '=', invoice.id], ['display_type', '=', 'product']], ['sale_line_ids', 'x_mnl_source_line_id', 'x_mnl_article', 'x_mnl_source_ref', 'x_mnl_units', 'x_mnl_length', 'x_mnl_width', 'quantity', 'price_unit', 'price_subtotal']);
  const sourceLines = await read('sale.order.line', [['order_id', 'in', [first, second]], ['display_type', '=', false]], ['x_mnl_accepted_article', 'x_mnl_accepted_units', 'x_mnl_accepted_length', 'x_mnl_accepted_width', 'x_mnl_accepted_qty', 'x_mnl_accepted_price', 'x_mnl_accepted_net']);
  assert.equal(invoiceLines.length, sourceLines.length);
  for (const il of invoiceLines) { assert.equal(il.sale_line_ids.length, 1); assert.equal(il.x_mnl_source_line_id[0], il.sale_line_ids[0]); const sl = sourceLines.find(x => x.id === il.sale_line_ids[0]); for (const [a, b] of [['x_mnl_article', 'x_mnl_accepted_article'], ['x_mnl_units', 'x_mnl_accepted_units'], ['x_mnl_length', 'x_mnl_accepted_length'], ['x_mnl_width', 'x_mnl_accepted_width'], ['quantity', 'x_mnl_accepted_qty'], ['price_unit', 'x_mnl_accepted_price'], ['price_subtotal', 'x_mnl_accepted_net']]) { if (typeof il[a] === 'number') assert.ok(Math.abs(il[a] - sl[b]) < 0.00001); else assert.equal(il[a], sl[b]); } }
  check('invoice_dimensions_prices_and_native_links_match_accepted_lines');
  await reject('linked_invoice_quantity_cannot_drift', () => cl.write('account.move.line', [invoiceLines[0].id], { quantity: invoiceLines[0].quantity + 1 }), /acceptad|acordat/i);
  await reject('repeated_invoice_creation_does_not_duplicate', () => cl.call('sale.advance.payment.inv', 'create_invoices', [[wizard]]));
  const [sourceAfter] = await read('sale.order', [['id', '=', sourceId]], ['state', 'name', 'amount_total']); assert.equal(sourceAfter.state, original.state); assert.equal(sourceAfter.name, original.name); assert.equal(sourceAfter.amount_total, original.amount_total); check('working_quotation_unchanged');
  result.success = true; save(); console.log(JSON.stringify({ success: true, output, orders: result.orders, invoiceId: result.invoiceId, checks: result.checks.length, invoicesPosted: 0 })); process.exit(0);
} catch (e) { result.error = e.message; save(); console.error(JSON.stringify({ success: false, output, error: e.message, orders: result.orders, invoiceId: result.invoiceId })); process.exit(1); }
