import { OdooClient } from "../src/odooClient.js";
import { requireConfig } from "../src/config.js";

const client = new OdooClient(requireConfig());
const key = process.argv[2] || "mnl_solutions.report_saleorder_style_d";
await client.authenticate();

const [view] = await client.searchRead("ir.ui.view", [["key", "=", key]], ["id", "name", "key", "active", "arch_db"], { limit: 1 });
if (!view) throw new Error(`No s'ha trobat la vista ${key}.`);

const xml = String(view.arch_db || "");
const fields = [...new Set([...xml.matchAll(/t-field=["']([^"']+)["']/g)].map((match) => match[1]))].sort();
const expressions = [...new Set([...xml.matchAll(/t-(?:esc|out|value)=["']([^"']+)["']/g)].map((match) => match[1]))].sort();
const headers = [...xml.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map((match) => match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
const plainText = xml.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();

function excerpts(pattern) {
  const result = [];
  for (const match of plainText.matchAll(new RegExp(`.{0,100}${pattern}.{0,160}`, "giu"))) result.push(match[0].trim());
  return result.slice(0, 10);
}

console.log(
  JSON.stringify(
    {
      database: client.database,
      id: view.id,
      name: view.name,
      key: view.key,
      active: view.active,
      length: xml.length,
      headers,
      fields,
      expressions,
      markers: {
        envio: excerpts("ENVIO|partner_shipping|adreça d(?:'|’)obra"),
        client: excerpts("CLIENTE|CLIENT|CUSTOMER|contacte"),
        payment: excerpts("FORMA DE PAGO|FORMA DE PAGAMENT|PAYMENT|payment_term"),
        bank: excerpts("IBAN|BANC|BANK|CAIXA"),
        acceptance: excerpts("ACCEPT|FIRMA|SIGNATURA|SIGNATURE"),
        induspanel: excerpts("INDUSPANEL"),
        ports: excerpts("PORTES|TRANSPORT"),
        validity: excerpts("VALIDESA|VALIDEZ|VALIDITY"),
        discounts: excerpts("DESCOMPTE|DESCUENTO|DISCOUNT"),
      },
    },
    null,
    2,
  ),
);
