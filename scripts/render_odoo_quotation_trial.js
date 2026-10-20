// Render the v3 trial without replacing the standard report, portal or form.
import { readFileSync } from 'node:fs';
import { requireConfig } from '../src/config.js';
import { OdooClient } from '../src/odooClient.js';

const cfg = requireConfig();
cfg.url = new URL(cfg.url).origin;
if (!process.env.ODOO_ENV_FILE || !/^provesmnl\d+$/.test(cfg.database)) {
  throw new Error('Selecciona explícitament una base de proves.');
}
const orderId = Number(process.argv[2]);
if (!Number.isSafeInteger(orderId) || orderId <= 0) throw new Error('Indica el pressupost existent.');
const cl = new OdooClient({ ...cfg, fetchImpl: (u, o) => fetch(u, { ...o, signal: AbortSignal.timeout(120000) }) });
const [standard] = await cl.searchRead('ir.actions.report', [['report_name', '=', 'mnl_solutions.report_quotation_standard']], ['paperformat_id']);
if (!standard?.paperformat_id) throw new Error('Cal la plantilla estàndard instal·lada a proves.');
const key = `mnl_solutions.quotation_v3_trial_${Date.now()}`;
const docKey = `${key}_document`;
const source = readFileSync(new URL('../templates/quotation_v3.xml', import.meta.url), 'utf8')
  .replace('mnl_solutions.report_quotation_v3_document', docKey);
const views = [];
let reportId;
const previousReport = process.env.MNL_PREVIEW_REPORT;
try {
  views.push(await cl.create('ir.ui.view', { name: 'MNL QA temporal - document v3', type: 'qweb', key: docKey, arch_db: source }));
  views.push(await cl.create('ir.ui.view', { name: 'MNL QA temporal - informe v3', type: 'qweb', key,
    arch_db: `<t t-name="${key}"><t t-call="web.html_container"><t t-foreach="docs" t-as="doc"><t t-call="${docKey}"/></t></t></t>` }));
  reportId = await cl.create('ir.actions.report', { name: 'MNL QA temporal - pressupost v3', model: 'sale.order',
    report_name: key, report_file: key, report_type: 'qweb-pdf', binding_model_id: false, paperformat_id: standard.paperformat_id[0] });
  process.env.MNL_PREVIEW_REPORT = key;
  await import('./render_odoo_quotation_preview.js');
} finally {
  if (previousReport === undefined) delete process.env.MNL_PREVIEW_REPORT;
  else process.env.MNL_PREVIEW_REPORT = previousReport;
  if (reportId) await cl.unlink('ir.actions.report', [reportId]);
  for (const id of views.reverse()) await cl.unlink('ir.ui.view', [id]);
}
