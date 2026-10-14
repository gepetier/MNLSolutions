import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { requireConfig } from "../src/config.js";

const config = requireConfig();
const orderId = Number(process.argv[2]);

if (!orderId) {
  throw new Error("Us: node scripts/test_odoo_quote_template_pdfs.js <sale.order id>");
}

const templates = [
  "mnl_solutions.report_saleorder_style_a",
  "mnl_solutions.report_saleorder_style_b",
  "mnl_solutions.report_saleorder_style_c",
  "mnl_solutions.report_saleorder_style_d",
];

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function cookieHeader(headers) {
  const raw = headers.getSetCookie ? headers.getSetCookie() : [];
  return raw.map((cookie) => cookie.split(";")[0]).join("; ");
}

async function authenticate() {
  const response = await fetch(`${config.url.replace(/\/$/, "")}/web/session/authenticate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      params: {
        db: config.database,
        login: config.username,
        password: config.apiKey,
      },
      id: Date.now(),
    }),
  });
  const body = await response.json();
  if (!response.ok || body.error || !body.result?.uid) {
    throw new Error(body.error?.data?.message || body.error?.message || "No s'ha pogut autenticar sessio web a Odoo.");
  }
  return cookieHeader(response.headers);
}

async function download(cookie, template) {
  const url = `${config.url.replace(/\/$/, "")}/report/pdf/${template}/${orderId}`;
  const response = await fetch(url, {
    headers: {
      cookie,
      accept: "application/pdf",
    },
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  return {
    ok: response.ok && bytes.slice(0, 4).toString("utf8") === "%PDF",
    status: response.status,
    contentType: response.headers.get("content-type"),
    bytes,
  };
}

async function main() {
  mkdirSync("logs", { recursive: true });
  mkdirSync(join("logs", "odoo-template-pdfs"), { recursive: true });

  const cookie = await authenticate();
  const results = [];
  for (const template of templates) {
    const result = await download(cookie, template);
    const suffix = template.split("_").pop();
    const file = join("logs", "odoo-template-pdfs", `${config.database}-order-${orderId}-${suffix}-${stamp()}.pdf`);
    writeFileSync(file, result.bytes);
    const head = result.ok ? "%PDF" : result.bytes.slice(0, 200).toString("utf8");
    results.push({
      template,
      ok: result.ok,
      status: result.status,
      contentType: result.contentType,
      bytes: result.bytes.length,
      file,
      head,
    });
  }

  const summaryFile = join("logs", `odoo-template-pdf-test-${config.database}-${stamp()}.json`);
  writeFileSync(summaryFile, JSON.stringify({ database: config.database, orderId, results }, null, 2));
  console.log(JSON.stringify({ database: config.database, orderId, summaryFile, results }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
