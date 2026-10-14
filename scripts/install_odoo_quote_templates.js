import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { requireConfig } from "../src/config.js";
import { OdooClient } from "../src/odooClient.js";

const client = new OdooClient(requireConfig());

const STYLE_DEFS = [
  { code: "a", title: "MNL Proposta A - Industrial Premium", template: "mnl_solutions.report_saleorder_style_a", report: "MNL Pressupost A - Industrial Premium", className: "mnl-style-a" },
  { code: "b", title: "MNL Proposta B - Tecnica Grid", template: "mnl_solutions.report_saleorder_style_b", report: "MNL Pressupost B - Tecnica Grid", className: "mnl-style-b" },
  { code: "c", title: "MNL Proposta C - Comercial Editorial", template: "mnl_solutions.report_saleorder_style_c", report: "MNL Pressupost C - Comercial Editorial", className: "mnl-style-c" },
  { code: "d", title: "MNL Proposta D - Classica PDF", template: "mnl_solutions.report_saleorder_style_d", report: "MNL Pressupost D - Classica PDF", className: "mnl-style-d" },
];

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function fields(model) {
  return client.fieldsGet(model, []);
}

function pick(spec, names) {
  return names.filter((name) => spec[name]);
}

function css() {
  return `
    .mnl-sheet { font-family: Arial, Helvetica, sans-serif; color: #161b1f; font-size: 12px; }
    .mnl-sheet * { box-sizing: border-box; }
    .mnl-brand { font-weight: 900; letter-spacing: 0; }
    .mnl-label { display: inline-block; padding: 6px 10px; border-radius: 5px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
    .mnl-muted { color: #66757a; }
    .mnl-money, .mnl-num { text-align: right; white-space: nowrap; }
    .mnl-lines { width: 100%; border-collapse: collapse; }
    .mnl-lines th, .mnl-lines td { vertical-align: top; }
    .mnl-totals { width: 290px; margin-left: auto; margin-top: 24px; }
    .mnl-totals .r { display: table; width: 100%; margin: 7px 0; }
    .mnl-totals .r span, .mnl-totals .r strong { display: table-cell; }
    .mnl-totals .r strong { text-align: right; }
    .mnl-totals .grand { border-top: 2px solid currentColor; padding-top: 10px; margin-top: 10px; font-size: 20px; font-weight: 800; }
    .mnl-style-a { background: #f7faf8; }
    .mnl-style-a .hero { margin: -16px -16px 30px; padding: 34px 38px; min-height: 220px; background: #11181b; color: #edf8f5; }
    .mnl-style-a .brand-row { display: table; width: 100%; }
    .mnl-style-a .brand-left, .mnl-style-a .brand-card { display: table-cell; vertical-align: top; }
    .mnl-style-a .mnl-brand { font-size: 42px; }
    .mnl-style-a h1 { margin: 46px 0 8px; font-size: 31px; line-height: 1.05; }
    .mnl-style-a .brand-card { width: 270px; padding: 18px; border: 1px solid #405153; border-radius: 6px; background: #1c2528; }
    .mnl-style-a .mnl-label { background: #3ef1c6; color: #05130f; }
    .mnl-style-a .meta { display: table; width: 100%; margin-bottom: 26px; }
    .mnl-style-a .meta > div { display: table-cell; width: 33.33%; border-left: 3px solid #00a889; padding-left: 12px; }
    .mnl-style-a .mnl-lines th { padding: 10px 8px; color: #fff; background: #1f2a2e; }
    .mnl-style-a .mnl-lines td { padding: 13px 8px; border-bottom: 1px solid #dfe7e4; }
    .mnl-style-a .foot { margin-top: 70px; padding-top: 18px; border-top: 1px solid #dfe7e4; }
    .mnl-style-b { padding: 18px; border: 2px solid #18232d; background: #fff; }
    .mnl-style-b .top { display: table; width: 100%; border-bottom: 2px solid #18232d; }
    .mnl-style-b .top-left, .mnl-style-b .top-right { display: table-cell; padding: 18px; vertical-align: top; }
    .mnl-style-b .top-right { width: 230px; border-left: 2px solid #18232d; background: #f4f7f9; }
    .mnl-style-b .mnl-brand { font-size: 30px; }
    .mnl-style-b .mnl-label { background: #18232d; color: #fff; }
    .mnl-style-b .data { display: table; width: 100%; border-bottom: 2px solid #18232d; }
    .mnl-style-b .data > div { display: table-cell; width: 25%; min-height: 70px; padding: 12px; border-right: 2px solid #18232d; }
    .mnl-style-b .data > div:last-child { border-right: 0; }
    .mnl-style-b h2 { margin: 18px 0; }
    .mnl-style-b .mnl-lines th { padding: 9px 7px; border-bottom: 2px solid #18232d; background: #f4f7f9; text-transform: uppercase; }
    .mnl-style-b .mnl-lines td { padding: 13px 7px; border-bottom: 1px solid #c8d0d8; }
    .mnl-style-b .conditions { margin-top: 70px; color: #5d6873; }
    .mnl-style-c { display: table; width: 100%; min-height: 960px; background: #fffdf8; color: #26231f; }
    .mnl-style-c .side, .mnl-style-c .main { display: table-cell; vertical-align: top; }
    .mnl-style-c .side { width: 190px; padding: 30px 20px; background: #173d3a; color: #fff; }
    .mnl-style-c .main { padding: 34px 36px; }
    .mnl-style-c .mnl-brand { font-size: 40px; }
    .mnl-style-c .mnl-label { margin-top: 28px; background: #ffe37a; color: #173d3a; }
    .mnl-style-c h1 { color: #173d3a; font-size: 40px; margin: 0 0 28px; }
    .mnl-style-c .client { display: table; width: 100%; padding: 18px 0; border-top: 1px solid #ded5c6; border-bottom: 1px solid #ded5c6; }
    .mnl-style-c .client > div { display: table-cell; width: 50%; }
    .mnl-style-c .mnl-lines { margin-top: 28px; }
    .mnl-style-c .mnl-lines th { padding: 10px 0; border-bottom: 2px solid #173d3a; color: #173d3a; text-transform: uppercase; }
    .mnl-style-c .mnl-lines td { padding: 16px 0; border-bottom: 1px solid #e4dac8; }
    .mnl-style-c .mnl-totals { padding: 16px; background: #f5efe2; }
    .mnl-style-c .note { margin-top: 55px; padding: 18px; border: 1px solid #ded5c6; color: #776f63; }
    .mnl-style-d { position: relative; padding: 6px 0 0; background: #fff; color: #111; font-size: 12px; }
    .mnl-style-d .blue-band { position: absolute; top: 0; right: 150px; width: 32px; height: 1000px; background: #d9eef3; z-index: 0; }
    .mnl-style-d > div:not(.blue-band), .mnl-style-d table { position: relative; z-index: 1; }
    .mnl-style-d .top { display: table; width: 100%; margin-bottom: 18px; }
    .mnl-style-d .company, .mnl-style-d .partners, .mnl-style-d .quote-box { display: table-cell; vertical-align: top; }
    .mnl-style-d .company { width: 245px; }
    .mnl-style-d .mark { display: inline-block; padding: 18px 14px; border: 7px solid #111; font-size: 26px; font-weight: 900; }
    .mnl-style-d .partners { text-align: center; font-size: 24px; font-weight: 900; color: #164d91; }
    .mnl-style-d .quote-box { width: 230px; padding: 8px 10px; background: #e7f5f8; }
    .mnl-style-d .quote-box h1 { margin: 0 0 9px; border-bottom: 3px solid #111; font-size: 22px; letter-spacing: 5px; }
    .mnl-style-d .addresses { display: table; width: 70%; margin: 8px 0 12px auto; border: 2px solid #111; }
    .mnl-style-d .addr { display: table-cell; width: 50%; border-right: 2px solid #111; }
    .mnl-style-d .addr:last-child { border-right: 0; }
    .mnl-style-d .addr h3 { margin: 0; padding: 4px; border-bottom: 2px solid #111; text-align: center; letter-spacing: 8px; }
    .mnl-style-d .addr p { margin: 10px 16px; line-height: 1.45; }
    .mnl-style-d .bar { height: 9px; margin-top: 12px; border-bottom: 3px solid #111; background: #d7e8ec; }
    .mnl-style-d .mnl-lines th { padding: 10px 6px; border-bottom: 2px solid #111; text-align: center; }
    .mnl-style-d .mnl-lines td { padding: 13px 6px; }
    .mnl-style-d .unit { background: #d9eef3; text-align: center; font-weight: 800; }
    .mnl-style-d .bottom { display: table; width: 100%; margin-top: 54px; padding-top: 16px; border-top: 5px double #111; }
    .mnl-style-d .payment, .mnl-style-d .summary { display: table-cell; vertical-align: top; }
    .mnl-style-d .summary { width: 340px; }
    .mnl-style-d .summary h2 { margin: 0 0 16px; text-align: center; }
    .mnl-style-d .summary .grand { border-top: 3px solid #111; padding-top: 8px; }
    .mnl-style-d .validity { margin-top: 18px; font-weight: 800; font-style: italic; text-align: center; }
  `;
}

function commonLineTable(styleCode) {
  if (styleCode === "c") {
    return `
      <table class="mnl-lines">
        <thead><tr><th>Concepte</th><th class="mnl-num">Quantitat</th><th class="mnl-money">Preu</th><th class="mnl-money">Import</th></tr></thead>
        <tbody>
          <t t-foreach="doc.order_line" t-as="line">
            <tr t-if="not line.display_type">
              <td><strong><span t-field="line.product_id.display_name"/></strong><div class="mnl-muted" t-field="line.name"/></td>
              <td class="mnl-num"><span t-field="line.product_uom_qty"/> <span t-field="line.product_uom_id.name"/></td>
              <td class="mnl-money"><span t-field="line.price_unit"/></td>
              <td class="mnl-money"><span t-field="line.price_subtotal" t-options="{'widget': 'monetary', 'display_currency': doc.currency_id}"/></td>
            </tr>
          </t>
        </tbody>
      </table>`;
  }

  if (styleCode === "d") {
    return `
      <table class="mnl-lines">
        <thead><tr><th>ARTICULO</th><th class="mnl-num">UDS</th><th class="mnl-num">LONG.</th><th class="mnl-num">ANCHO</th><th class="mnl-num">CANTIDAD</th><th class="mnl-num">TOTAL</th><th></th><th class="mnl-money">PRECIO</th><th class="mnl-money">IMPORTE</th></tr></thead>
        <tbody>
          <t t-foreach="doc.order_line" t-as="line">
            <tr t-if="not line.display_type">
              <td><span t-field="line.name"/></td>
              <td class="mnl-num">1</td>
              <td class="mnl-num"></td>
              <td class="mnl-num"></td>
              <td class="mnl-num"><span t-field="line.product_uom_qty"/></td>
              <td class="mnl-num"><span t-field="line.product_uom_qty"/></td>
              <td class="unit"><span t-field="line.product_uom_id.name"/></td>
              <td class="mnl-money"><span t-field="line.price_unit"/></td>
              <td class="mnl-money"><span t-field="line.price_subtotal" t-options="{'widget': 'monetary', 'display_currency': doc.currency_id}"/></td>
            </tr>
          </t>
        </tbody>
      </table>`;
  }

  return `
    <table class="mnl-lines">
      <thead><tr><th>Article</th><th class="mnl-num">Uds</th><th class="mnl-num">Quantitat</th><th class="mnl-money">Preu</th><th class="mnl-money">Import</th></tr></thead>
      <tbody>
        <t t-foreach="doc.order_line" t-as="line">
          <tr t-if="not line.display_type">
            <td><strong><span t-field="line.product_id.display_name"/></strong><div class="mnl-muted" t-field="line.name"/></td>
            <td class="mnl-num">1</td>
            <td class="mnl-num"><span t-field="line.product_uom_qty"/> <span t-field="line.product_uom_id.name"/></td>
            <td class="mnl-money"><span t-field="line.price_unit"/></td>
            <td class="mnl-money"><span t-field="line.price_subtotal" t-options="{'widget': 'monetary', 'display_currency': doc.currency_id}"/></td>
          </tr>
        </t>
      </tbody>
    </table>`;
}

function totals() {
  return `
    <div class="mnl-totals">
      <div class="r"><span>Base imposable</span><strong><span t-field="doc.amount_untaxed" t-options="{'widget': 'monetary', 'display_currency': doc.currency_id}"/></strong></div>
      <div class="r"><span>Impostos</span><strong><span t-field="doc.amount_tax" t-options="{'widget': 'monetary', 'display_currency': doc.currency_id}"/></strong></div>
      <div class="r grand"><span>Total</span><strong><span t-field="doc.amount_total" t-options="{'widget': 'monetary', 'display_currency': doc.currency_id}"/></strong></div>
    </div>`;
}

function body(def) {
  if (def.code === "a") {
    return `
      <div class="hero"><div class="brand-row"><div class="brand-left"><div class="mnl-brand">MNL</div><h1>Pressupost industrial premium</h1><p class="mnl-muted">Panells, remateria i solucions constructives a mida</p></div><div class="brand-card"><span class="mnl-label">Proposta A</span><p>Pressupost</p><h2 t-field="doc.name"/><p>Total proposta</p><h2><span t-field="doc.amount_total" t-options="{'widget': 'monetary', 'display_currency': doc.currency_id}"/></h2></div></div></div>
      <div class="meta"><div><span class="mnl-muted">Client</span><br/><strong t-field="doc.partner_id.name"/></div><div><span class="mnl-muted">Data</span><br/><strong><span t-field="doc.date_order" t-options="{'widget': 'date'}"/></strong></div><div><span class="mnl-muted">Validesa</span><br/><strong><span t-field="doc.validity_date" t-options="{'widget': 'date'}"/></strong></div></div>
      ${commonLineTable(def.code)}
      ${totals()}
      <div class="foot"><strong>Condicions</strong><br/>Preus subjectes a validacio tecnica i disponibilitat de material.</div>`;
  }
  if (def.code === "b") {
    return `
      <div class="top"><div class="top-left"><div class="mnl-brand">MNL SOLUTIONS</div><p class="mnl-muted">Departament tecnic i pressupostos</p></div><div class="top-right"><span class="mnl-label">Proposta B</span><h2 t-field="doc.name"/></div></div>
      <div class="data"><div><span class="mnl-muted">Client</span><br/><strong t-field="doc.partner_id.name"/></div><div><span class="mnl-muted">Projecte</span><br/><strong t-field="doc.client_order_ref"/></div><div><span class="mnl-muted">Data</span><br/><strong><span t-field="doc.date_order" t-options="{'widget': 'date'}"/></strong></div><div><span class="mnl-muted">Comercial</span><br/><strong t-field="doc.user_id.name"/></div></div>
      <h2>Desglossament tecnic</h2>
      ${commonLineTable(def.code)}
      ${totals()}
      <div class="conditions"><strong>Notes tecniques:</strong> amidaments calculats segons dades facilitades. La fabricacio queda subjecta a revisio de plannols i confirmacio final del client.</div>`;
  }
  if (def.code === "c") {
    return `
      <div class="side"><div class="mnl-brand">MNL</div><span class="mnl-label">Proposta C</span><p style="margin-top:50px">PRESSUPOST</p><h3 t-field="doc.name"/><p>DATA</p><h3><span t-field="doc.date_order" t-options="{'widget': 'date'}"/></h3><p>TOTAL</p><h3><span t-field="doc.amount_total" t-options="{'widget': 'monetary', 'display_currency': doc.currency_id}"/></h3></div>
      <div class="main"><h1>Proposta comercial</h1><div class="client"><div><span class="mnl-muted">Preparat per</span><h3 t-field="doc.partner_id.name"/><p><span t-field="doc.partner_id.street"/><br/><span t-field="doc.partner_id.zip"/> <span t-field="doc.partner_id.city"/></p></div><div><span class="mnl-muted">Projecte</span><h3 t-field="doc.client_order_ref"/><p>Solucio amb panell sandwich, perfileria i transport.</p></div></div>${commonLineTable(def.code)}${totals()}<div class="note"><strong>Format comercial i llegible per client final.</strong><br/>Redueix soroll tecnic, destaca el valor global i deixa els amidaments com a suport de cada partida.</div></div>`;
  }
  return `
    <div class="blue-band"></div>
    <div class="top"><div class="company"><div class="mark">MNL</div><p><strong t-field="doc.company_id.name"/><br/><span t-field="doc.company_id.street"/><br/><span t-field="doc.company_id.zip"/> <span t-field="doc.company_id.city"/><br/>NIF: <span t-field="doc.company_id.vat"/></p></div><div class="partners">HUURRE<br/><span style="color:#666">Induspanel</span></div><div class="quote-box"><h1>PRESUPUESTO</h1><p><strong>REFERENCIA:</strong> <span t-field="doc.client_order_ref"/><br/><strong>N. DOCUMENTO:</strong> <span t-field="doc.name"/><br/><strong>FECHA:</strong> <span t-field="doc.date_order" t-options="{'widget': 'date'}"/></p></div></div>
    <div class="addresses"><div class="addr"><h3>ENVIO</h3><p><strong t-field="doc.partner_shipping_id.name"/><br/><span t-field="doc.partner_shipping_id.street"/><br/><span t-field="doc.partner_shipping_id.zip"/> <span t-field="doc.partner_shipping_id.city"/></p></div><div class="addr"><h3>CLIENTE</h3><p><strong t-field="doc.partner_id.name"/><br/><span t-field="doc.partner_id.street"/><br/>NIF: <span t-field="doc.partner_id.vat"/><br/>Tlf: <span t-field="doc.partner_id.phone"/></p></div></div>
    <div class="bar"></div>
    ${commonLineTable(def.code)}
    <div class="bottom"><div class="payment"><strong>FORMA DE PAGO:</strong> <span t-field="doc.payment_term_id.name"/><br/><strong>NOTAS:</strong> Oferta generada desde Odoo MNL.</div><div class="summary"><h2>RESUMEN</h2>${totals()}<div class="validity">Esta oferta tiene una validez de 10 dias</div></div></div>`;
}

function arch(def) {
  return `<t t-name="${def.template}">
  <t t-call="web.html_container">
    <t t-foreach="docs" t-as="doc">
      <t t-set="doc" t-value="doc.with_context(lang=doc.partner_id.lang)"/>
      <div class="page mnl-sheet ${def.className}">
        <style>${css()}</style>
        ${body(def)}
      </div>
    </t>
  </t>
</t>`;
}

async function backupExisting() {
  const viewSpec = await fields("ir.ui.view");
  const reportSpec = await fields("ir.actions.report");
  const views = await client.searchRead(
    "ir.ui.view",
    [["key", "in", STYLE_DEFS.map((def) => def.template)]],
    pick(viewSpec, ["id", "name", "type", "key", "arch_db", "active"]),
    { limit: 20 },
  );
  const reports = await client.searchRead(
    "ir.actions.report",
    [["report_name", "in", STYLE_DEFS.map((def) => def.template)]],
    pick(reportSpec, ["id", "name", "model", "report_name", "report_file", "report_type", "binding_model_id", "binding_type", "print_report_name"]),
    { limit: 20 },
  );
  mkdirSync("logs", { recursive: true });
  const file = join("logs", `odoo-quote-templates-backup-${client.database}-${stamp()}.json`);
  writeFileSync(file, JSON.stringify({ database: client.database, backedUpAt: new Date().toISOString(), views, reports }, null, 2));
  return { file, views, reports };
}

async function upsertView(def) {
  const existing = await client.searchRead("ir.ui.view", [["key", "=", def.template]], ["id", "name", "key"], { limit: 1 });
  const values = {
    name: def.title,
    type: "qweb",
    key: def.template,
    arch_db: arch(def),
  };
  if (existing.length) {
    await client.write("ir.ui.view", [existing[0].id], values);
    return existing[0].id;
  }
  return client.create("ir.ui.view", values);
}

async function saleOrderModelId() {
  const models = await client.searchRead("ir.model", [["model", "=", "sale.order"]], ["id"], { limit: 1 });
  if (!models.length) throw new Error("No trobo ir.model per sale.order");
  return models[0].id;
}

async function upsertReport(def, modelId) {
  const existing = await client.searchRead("ir.actions.report", [["report_name", "=", def.template]], ["id", "name"], { limit: 1 });
  const values = {
    name: def.report,
    model: "sale.order",
    report_name: def.template,
    report_file: def.template,
    report_type: "qweb-pdf",
    binding_model_id: modelId,
    binding_type: "report",
    print_report_name: `'${def.report} - %s' % (object.name)`,
  };
  if (existing.length) {
    await client.write("ir.actions.report", [existing[0].id], values);
    return existing[0].id;
  }
  return client.create("ir.actions.report", values);
}

async function ensureDemoOrder() {
  const [partner] = await client.searchRead("res.partner", [["name", "=", "Client Demo Plantilles MNL"]], ["id"], { limit: 1 });
  const partnerId =
    partner?.id ||
    (await client.create("res.partner", {
      name: "Client Demo Plantilles MNL",
      street: "C/ Industria, 44",
      zip: "08000",
      city: "Barcelona",
      phone: "600 000 000",
      email: "demo@mnl.example",
      vat: "ESB00000000",
    }));

  const [product] = await client.searchRead("product.product", [["name", "=", "Panell demo MNL per plantilles"]], ["id"], { limit: 1 });
  let productId = product?.id;
  if (!productId) {
    const tmplId = await client.create("product.template", {
      name: "Panell demo MNL per plantilles",
      list_price: 24.35,
      sale_ok: true,
      purchase_ok: false,
    });
    const variants = await client.searchRead("product.product", [["product_tmpl_id", "=", tmplId]], ["id"], { limit: 1 });
    productId = variants[0].id;
  }

  const orderId = await client.create("sale.order", {
    partner_id: partnerId,
    client_order_ref: "Coberta demo MNL",
  });
  await client.create("sale.order.line", {
    order_id: orderId,
    product_id: productId,
    name: "1.01.-Panell sandwich demo MNL\\nColor Blanco Pirineo 1006",
    product_uom_qty: 151.8,
    price_unit: 24.35,
  });
  await client.create("sale.order.line", {
    order_id: orderId,
    product_id: productId,
    name: "1.02.-Remat lateral lacat\\nDesenvolupament 500 mm",
    product_uom_qty: 48,
    price_unit: 18.4,
  });
  return orderId;
}

async function renderReports(orderId) {
  const results = [];
  for (const def of STYLE_DEFS) {
    try {
      const rendered = await client.call("ir.actions.report", "_render_qweb_pdf", [def.template, [orderId]]);
      results.push({ template: def.template, ok: true, bytesBase64: typeof rendered?.[0] === "string" ? rendered[0].length : null });
    } catch (error) {
      results.push({ template: def.template, ok: false, error: error.message });
    }
  }
  return results;
}

async function main() {
  await client.authenticate();
  const backup = await backupExisting();
  const modelId = await saleOrderModelId();
  const installed = [];
  for (const def of STYLE_DEFS) {
    const viewId = await upsertView(def);
    const reportId = await upsertReport(def, modelId);
    installed.push({ code: def.code, viewId, reportId, template: def.template });
  }
  const orderId = await ensureDemoOrder();
  const render = await renderReports(orderId);
  const result = { database: client.database, backupFile: backup.file, installed, demoOrderId: orderId, render };
  const file = join("logs", `odoo-quote-templates-install-${client.database}-${stamp()}.json`);
  writeFileSync(file, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ ...result, logFile: file }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exitCode = 1;
});
