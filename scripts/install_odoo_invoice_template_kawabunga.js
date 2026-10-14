import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { requireConfig } from "../src/config.js";
import { OdooClient } from "../src/odooClient.js";

const client = new OdooClient(requireConfig());
const TEMPLATE_KEY = "mnl_solutions.report_invoice_kawabunga";
const TEMPLATE_NAME = "kawabunga";
const BASE_NAME = "Proves Manolete";

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function extractStyles(arch = "") {
  return [...arch.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((match) => match[1]).join("\n");
}

async function locateBaseTemplate() {
  const reports = await client.searchRead(
    "ir.actions.report",
    ["|", "|", ["name", "ilike", "Manolete"], ["report_name", "ilike", "Manolete"], ["report_file", "ilike", "Manolete"]],
    ["id", "name", "report_name", "report_file"],
    { limit: 10 },
  );
  const reportKeys = reports.flatMap((item) => [item.report_name, item.report_file]).filter(Boolean);
  const domain = reportKeys.length
    ? ["|", "|", "|", ["name", "ilike", "Manolete"], ["key", "ilike", "Manolete"], ["arch_db", "ilike", "Manolete"], ["key", "in", reportKeys]]
    : ["|", "|", ["name", "ilike", "Manolete"], ["key", "ilike", "Manolete"], ["arch_db", "ilike", "Manolete"]];
  const views = await client.searchRead(
    "ir.ui.view",
    domain,
    ["id", "name", "key", "arch_db", "active"],
    { limit: 10 },
  );
  const view = views.find((item) => item.key && reportKeys.includes(item.key)) || views[0];
  if (!view) throw new Error(`No trobo la plantilla base ${BASE_NAME} a Informes.`);
  return { reports, views, view, css: extractStyles(view.arch_db) };
}

function templateArch(baseCss) {
  return `<t t-name="${TEMPLATE_KEY}">
  <t t-call="web.html_container">
    <t t-foreach="docs" t-as="doc">
      <t t-set="doc" t-value="doc.with_context(lang=doc.partner_id.lang)"/>
      <t t-set="company" t-value="doc.company_id"/>
      <div class="page mnl-sheet mnl-invoice-kawabunga">
        <style>
          ${baseCss}
          @page { size: A4; margin: 12mm 12mm 14mm 12mm; }
          .mnl-invoice-kawabunga { font-family: DejaVu Sans, Arial, sans-serif; color: #16212b; font-size: 10px; line-height: 1.35; padding: 0 !important; min-height: 0 !important; }
          .mnl-invoice-kawabunga .kw-head { display: table; width: 100%; margin-bottom: 14px; }
          .mnl-invoice-kawabunga .kw-brand, .mnl-invoice-kawabunga .kw-meta { display: table-cell; vertical-align: top; }
          .mnl-invoice-kawabunga .kw-brand { width: 58%; }
          .mnl-invoice-kawabunga .kw-meta { width: 42%; text-align: right; }
          .mnl-invoice-kawabunga .kw-logo { max-width: 125px; max-height: 58px; margin-bottom: 6px; }
          .mnl-invoice-kawabunga h1 { margin: 0 0 8px; font-size: 25px; text-transform: uppercase; letter-spacing: 1px; }
          .mnl-invoice-kawabunga .kw-rule { height: 3px; background: #f4bf00; margin: 12px 0 8px; }
          .mnl-invoice-kawabunga .kw-parties { display: table; width: 100%; margin: 8px 0 14px; }
          .mnl-invoice-kawabunga .kw-party { display: table-cell; width: 50%; vertical-align: top; padding-right: 18px; }
          .mnl-invoice-kawabunga .kw-label { color: #64717e; font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: .55px; }
          .mnl-invoice-kawabunga .kw-lines { width: 100%; border-collapse: collapse; }
          .mnl-invoice-kawabunga .kw-lines th { padding: 7px 6px; border-top: 2px solid #16212b; border-bottom: 1px solid #16212b; text-align: left; font-size: 8px; }
          .mnl-invoice-kawabunga .kw-lines td { padding: 8px 6px; border-bottom: 1px solid #d7dde2; vertical-align: top; }
          .mnl-invoice-kawabunga .kw-num { text-align: right !important; white-space: nowrap; }
          .mnl-invoice-kawabunga .kw-bottom { display: table; width: 100%; margin-top: 18px; page-break-inside: avoid; }
          .mnl-invoice-kawabunga .kw-payment, .mnl-invoice-kawabunga .kw-totals { display: table-cell; vertical-align: bottom; }
          .mnl-invoice-kawabunga .kw-payment { width: 58%; padding-right: 25px; }
          .mnl-invoice-kawabunga .kw-totals { width: 42%; }
          .mnl-invoice-kawabunga .kw-total-row { display: table; width: 100%; padding: 5px 0; border-bottom: 1px solid #17212b; }
          .mnl-invoice-kawabunga .kw-total-row span { display: table-cell; }
          .mnl-invoice-kawabunga .kw-grand { font-size: 14px; font-weight: 700; border-bottom: 3px solid #17212b; }
          .mnl-invoice-kawabunga .kw-note { margin-top: 24px; font-style: italic; }
          .mnl-invoice-kawabunga .kw-footer { position: absolute; bottom: 4mm; left: 0; right: 0; text-align: center; color: #697783; font-size: 8px; }
        </style>

        <div class="kw-head">
          <div class="kw-brand">
            <img t-if="company.logo" class="kw-logo" t-att-src="image_data_uri(company.logo)" alt="MNL"/>
            <div><strong t-field="company.name"/></div>
            <div t-field="company.partner_id" t-options="{'widget': 'contact', 'fields': ['address'], 'no_marker': True}"/>
            <div t-if="company.vat"><span class="kw-label">NIF</span> <span t-field="company.vat"/></div>
          </div>
          <div class="kw-meta">
            <h1>Factura</h1>
            <div><span class="kw-label">Num. factura</span> <strong t-field="doc.name"/></div>
            <div><span class="kw-label">Data</span> <span t-field="doc.invoice_date"/></div>
            <div t-if="doc.invoice_date_due"><span class="kw-label">Venciment</span> <span t-field="doc.invoice_date_due"/></div>
            <div t-if="doc.invoice_origin"><span class="kw-label">Referencia</span> <span t-field="doc.invoice_origin"/></div>
          </div>
        </div>

        <div class="kw-rule"/>
        <div class="kw-parties">
          <div class="kw-party">
            <div class="kw-label">Facturar a</div>
            <strong t-field="doc.partner_id.name"/>
            <div t-field="doc.partner_id" t-options="{'widget': 'contact', 'fields': ['address', 'phone', 'email'], 'no_marker': True}"/>
            <div t-if="doc.partner_id.vat"><span class="kw-label">NIF</span> <span t-field="doc.partner_id.vat"/></div>
          </div>
          <div class="kw-party" t-if="'partner_shipping_id' in doc._fields and doc.partner_shipping_id and doc.partner_shipping_id != doc.partner_id">
            <div class="kw-label">Adreca d'entrega / obra</div>
            <strong t-field="doc.partner_shipping_id.name"/>
            <div t-field="doc.partner_shipping_id" t-options="{'widget': 'contact', 'fields': ['address', 'phone'], 'no_marker': True}"/>
          </div>
        </div>

        <table class="kw-lines">
          <thead><tr><th>Descripcio</th><th class="kw-num">Uts.</th><th class="kw-num">Preu</th><th class="kw-num">Dto.</th><th class="kw-num">Impostos</th><th class="kw-num">Import</th></tr></thead>
          <tbody>
            <t t-foreach="doc.invoice_line_ids" t-as="line">
              <tr t-if="line.display_type == 'line_section'"><td colspan="6"><strong t-field="line.name"/></td></tr>
              <tr t-elif="line.display_type == 'line_note'"><td colspan="6"><em t-field="line.name"/></td></tr>
              <tr t-else="">
                <td><span t-field="line.name"/></td>
                <td class="kw-num"><span t-field="line.quantity" t-options="{'widget': 'float', 'precision': 2}"/></td>
                <td class="kw-num"><span t-field="line.price_unit" t-options="{'widget': 'float', 'precision': 2}"/> EUR</td>
                <td class="kw-num"><span t-if="line.discount" t-field="line.discount"/> <span t-if="line.discount">%</span></td>
                <td class="kw-num"><span t-esc="', '.join(line.tax_ids.mapped('name'))"/></td>
                <td class="kw-num"><span t-field="line.price_subtotal" t-options="{'widget': 'float', 'precision': 2}"/> EUR</td>
              </tr>
            </t>
          </tbody>
        </table>

        <div class="kw-bottom">
          <div class="kw-payment">
            <div class="kw-label">Forma de pagament</div>
            <div t-if="'invoice_payment_term_id' in doc._fields and doc.invoice_payment_term_id" t-field="doc.invoice_payment_term_id.name"/>
            <div t-else="">Segons condicions acordades</div>
            <t t-if="'partner_bank_id' in doc._fields and doc.partner_bank_id and ('invoice_payment_term_id' not in doc._fields or not doc.invoice_payment_term_id or 'transfer' in doc.invoice_payment_term_id.name.lower() or 'transferència' in doc.invoice_payment_term_id.name.lower())">
              <div class="kw-label" style="margin-top:8px">Dades bancàries</div>
              <div t-field="doc.partner_bank_id.acc_number"/>
            </t>
          </div>
          <div class="kw-totals">
            <div class="kw-total-row"><span>Base imposable</span><span class="kw-num"><span t-field="doc.amount_untaxed" t-options="{'widget': 'float', 'precision': 2}"/> EUR</span></div>
            <div class="kw-total-row"><span>Impostos</span><span class="kw-num"><span t-field="doc.amount_tax" t-options="{'widget': 'float', 'precision': 2}"/> EUR</span></div>
            <div class="kw-total-row kw-grand"><span>Total</span><span class="kw-num"><span t-field="doc.amount_total" t-options="{'widget': 'float', 'precision': 2}"/> EUR</span></div>
          </div>
        </div>
        <div class="kw-note">Gracies per confiar en MNL Solutions.</div>
        <div class="kw-footer"><span t-field="company.name"/> - <span t-field="company.partner_id.city"/> - <span class="page"/> / <span class="topage"/></div>
      </div>
    </t>
  </t>
</t>`;
}

async function modelId(model) {
  const [item] = await client.searchRead("ir.model", [["model", "=", model]], ["id"], { limit: 1 });
  if (!item) throw new Error(`No trobo el model ${model}.`);
  return item.id;
}

async function backupExisting() {
  const views = await client.searchRead("ir.ui.view", [["key", "=", TEMPLATE_KEY]], ["id", "name", "key", "arch_db", "active"], { limit: 5 });
  const reports = await client.searchRead("ir.actions.report", [["report_name", "=", TEMPLATE_KEY]], ["id", "name", "model", "report_name", "report_file", "report_type", "binding_model_id", "binding_type", "print_report_name"], { limit: 5 });
  mkdirSync("logs", { recursive: true });
  const file = join("logs", `odoo-invoice-kawabunga-backup-${client.database}-${stamp()}.json`);
  writeFileSync(file, JSON.stringify({ database: client.database, backedUpAt: new Date().toISOString(), views, reports }, null, 2));
  return file;
}

async function upsertView(arch) {
  const [existing] = await client.searchRead("ir.ui.view", [["key", "=", TEMPLATE_KEY]], ["id"], { limit: 1 });
  const values = { name: TEMPLATE_NAME, type: "qweb", key: TEMPLATE_KEY, arch_db: arch };
  if (existing) {
    await client.write("ir.ui.view", [existing.id], values);
    return existing.id;
  }
  return client.create("ir.ui.view", values);
}

async function upsertReport(accountMoveModelId) {
  const [existing] = await client.searchRead("ir.actions.report", [["report_name", "=", TEMPLATE_KEY]], ["id"], { limit: 1 });
  const values = {
    name: TEMPLATE_NAME,
    model: "account.move",
    report_name: TEMPLATE_KEY,
    report_file: TEMPLATE_KEY,
    report_type: "qweb-pdf",
    binding_model_id: accountMoveModelId,
    binding_type: "report",
    print_report_name: "'kawabunga - %s' % (object.name)",
  };
  if (existing) {
    await client.write("ir.actions.report", [existing.id], values);
    return existing.id;
  }
  return client.create("ir.actions.report", values);
}

async function renderCheck() {
  const [invoice] = await client.searchRead(
    "account.move",
    [["move_type", "in", ["out_invoice", "out_refund"]], ["state", "=", "posted"]],
    ["id", "name"],
    { limit: 1, order: "invoice_date desc,id desc" },
  );
  if (!invoice) return { ok: null, reason: "No hi ha cap factura publicada per provar." };
  const [report] = await client.searchRead("ir.actions.report", [["report_name", "=", TEMPLATE_KEY]], ["id", "name"], { limit: 1 });
  const action = await client.call("ir.actions.report", "report_action", [[report.id], [invoice.id]]);
  try {
    const authResponse = await fetch(`${client.url}/web/session/authenticate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      params: { db: client.database, login: client.username, password: client.apiKey },
      id: Date.now(),
    }),
    });
    const authBody = await authResponse.json();
    if (!authResponse.ok || authBody.error || !authBody.result?.uid) {
      throw new Error(authBody.error?.data?.message || "No s'ha pogut obrir la sessió web d'Odoo per validar el PDF.");
    }
    const cookie = authResponse.headers.get("set-cookie")?.split(";", 1)[0];
    const pdfResponse = await fetch(`${client.url}/report/pdf/${TEMPLATE_KEY}/${invoice.id}`, {
      headers: cookie ? { cookie } : {},
    });
    const contentType = pdfResponse.headers.get("content-type") || "";
    const bytes = new Uint8Array(await pdfResponse.arrayBuffer());
    if (!pdfResponse.ok || !contentType.includes("application/pdf")) {
      const message = new TextDecoder().decode(bytes).slice(0, 1500);
      throw new Error(`El render web de kawabunga ha fallat (${pdfResponse.status}, ${contentType}): ${message}`);
    }
    mkdirSync("output/pdf", { recursive: true });
    const pdfFile = join("output/pdf", `kawabunga-proves112-${invoice.id}.pdf`);
    writeFileSync(pdfFile, bytes);
    return { ok: true, actionOk: action?.type === "ir.actions.report", invoiceId: invoice.id, invoiceName: invoice.name, bytes: bytes.length, pdfFile };
  } catch (error) {
    return { ok: false, actionOk: action?.type === "ir.actions.report", invoiceId: invoice.id, invoiceName: invoice.name, reason: error.message };
  }
}

async function main() {
  await client.authenticate();
  const base = await locateBaseTemplate();
  if (process.argv.includes("--inspect")) {
    console.log(JSON.stringify({
      database: client.database,
      reports: base.reports.map(({ id, name, report_name }) => ({ id, name, report_name })),
      views: base.views.map(({ id, name, key }) => ({ id, name, key })),
      baseView: { id: base.view.id, name: base.view.name, key: base.view.key },
      inheritedCssChars: base.css.length,
    }, null, 2));
    return;
  }
  const backupFile = await backupExisting();
  const viewId = await upsertView(templateArch(base.css));
  const reportId = await upsertReport(await modelId("account.move"));
  const render = await renderCheck();
  const result = { database: client.database, template: TEMPLATE_NAME, templateKey: TEMPLATE_KEY, baseViewId: base.view.id, viewId, reportId, backupFile, render };
  mkdirSync("logs", { recursive: true });
  const logFile = join("logs", `odoo-invoice-kawabunga-install-${client.database}-${stamp()}.json`);
  writeFileSync(logFile, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ ...result, logFile }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exitCode = 1;
});
