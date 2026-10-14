import { OdooClient } from "../src/odooClient.js";
import { requireConfig } from "../src/config.js";

const client = new OdooClient(requireConfig());
await client.authenticate();

async function availableFields(model, wanted) {
  const definitions = await client.fieldsGet(model, []);
  return wanted.filter((name) => definitions[name]);
}

async function readAll(model, wanted, domain = []) {
  const fields = await availableFields(model, wanted);
  return client.searchRead(model, domain, fields, { limit: 10000, order: "id" });
}

function populated(rows, field) {
  return rows.filter((row) => row[field] !== false && row[field] !== null && row[field] !== "" && row[field] !== undefined).length;
}

function distribution(rows, field) {
  return Object.fromEntries(
    [...rows.reduce((map, row) => map.set(String(row[field] || "(buit)"), (map.get(String(row[field] || "(buit)")) || 0) + 1), new Map())].sort(),
  );
}

function close(a, b) {
  return Math.abs(Number(a || 0) - Number(b || 0)) < 0.0001;
}

const partners = await readAll("res.partner", [
  "name",
  "vat",
  "is_company",
  "parent_id",
  "lang",
  "x_studio_tipus_client",
  "x_studio_estat_comercial",
  "x_studio_contacte_principal_id",
]);
const orders = await readAll("sale.order", [
  "name",
  "state",
  "partner_id",
  "validity_date",
  "payment_term_id",
  "x_studio_referencia",
  "x_studio_revisio",
  "x_studio_validesa_dies",
  "x_studio_idioma_document",
  "x_studio_contacte_pressupost_id",
  "x_studio_adreca_obra_id",
  "x_studio_condicions_acceptacio",
  "x_studio_descompte_global",
  "x_studio_mostrar_descomptes",
  "x_studio_mostrar_descompte_pdf",
]);
const lines = await readAll("sale.order.line", [
  "order_id",
  "display_type",
  "product_id",
  "product_uom_qty",
  "price_unit",
  "discount",
  "x_studio_uds",
  "x_studio_long",
  "x_studio_ancho_1",
  "x_studio_cantidad",
  "x_studio_total",
  "x_studio_importe_mnl",
  "x_studio_tipus_calcul",
  "x_studio_classificador",
  "x_studio_familia",
  "x_studio_descripcio_comercial",
  "x_studio_cost_unitari",
  "x_studio_marge_objectiu",
  "x_studio_marge_real",
  "x_studio_proveidor_id",
]);
const products = await readAll("product.product", [
  "name",
  "default_code",
  "description_sale",
  "x_studio_descripcio_comercial",
  "x_studio_tipus_calcul",
  "x_studio_marge_objectiu",
]);

const productLines = lines.filter((line) => !line.display_type && line.product_id);
const calculationChecks = productLines.map((line) => {
  const type = line.x_studio_tipus_calcul || "uds";
  const uds = Number(line.x_studio_uds || 0);
  const long = Number(line.x_studio_long || 0);
  const width = Number(line.x_studio_ancho_1 || 0);
  const expected = type === "m2" ? uds * long * width : type === "ml" ? uds * long : uds;
  const expectedAmount = expected * Number(line.price_unit || 0) * (1 - Number(line.discount || 0) / 100);
  return {
    id: line.id,
    type,
    expected,
    quantityMatches: close(line.product_uom_qty, expected),
    cantidadMatches: close(line.x_studio_cantidad, expected),
    totalMatches: close(line.x_studio_total, expected),
    amountMatches: close(line.x_studio_importe_mnl, expectedAmount),
  };
});

const failingCalculations = calculationChecks.filter(
  (row) => !(row.quantityMatches && row.cantidadMatches && row.totalMatches && row.amountMatches),
);

console.log(
  JSON.stringify(
    {
      auditedAt: new Date().toISOString(),
      database: client.database,
      mode: "read-only",
      partners: {
        count: partners.length,
        withVat: populated(partners, "vat"),
        companies: partners.filter((row) => row.is_company).length,
        childContacts: partners.filter((row) => row.parent_id).length,
        typeDistribution: distribution(partners, "x_studio_tipus_client"),
        statusDistribution: distribution(partners, "x_studio_estat_comercial"),
        languageDistribution: distribution(partners, "lang"),
        withMainContact: populated(partners, "x_studio_contacte_principal_id"),
      },
      orders: {
        count: orders.length,
        stateDistribution: distribution(orders, "state"),
        withReference: populated(orders, "x_studio_referencia"),
        revisionDistribution: distribution(orders, "x_studio_revisio"),
        validityDaysDistribution: distribution(orders, "x_studio_validesa_dies"),
        documentLanguageDistribution: distribution(orders, "x_studio_idioma_document"),
        withQuoteContact: populated(orders, "x_studio_contacte_pressupost_id"),
        withDeliveryAddress: populated(orders, "x_studio_adreca_obra_id"),
        withAcceptance: populated(orders, "x_studio_condicions_acceptacio"),
        withPaymentTerm: populated(orders, "payment_term_id"),
        sample: orders.slice(-10),
      },
      lines: {
        count: lines.length,
        productLineCount: productLines.length,
        calculationTypeDistribution: distribution(productLines, "x_studio_tipus_calcul"),
        withClassifier: populated(productLines, "x_studio_classificador"),
        withFamily: populated(productLines, "x_studio_familia"),
        withCommercialDescription: populated(productLines, "x_studio_descripcio_comercial"),
        withCost: populated(productLines, "x_studio_cost_unitari"),
        withTargetMargin: populated(productLines, "x_studio_marge_objectiu"),
        withRealMargin: populated(productLines, "x_studio_marge_real"),
        withSupplier: populated(productLines, "x_studio_proveidor_id"),
        calculationChecks: calculationChecks.length,
        calculationFailures: failingCalculations.length,
        failingCalculationSample: failingCalculations.slice(0, 20),
      },
      products: {
        count: products.length,
        withSaleDescription: populated(products, "description_sale"),
        withCommercialDescription: populated(products, "x_studio_descripcio_comercial"),
        calculationTypeDistribution: distribution(products, "x_studio_tipus_calcul"),
        withTargetMargin: populated(products, "x_studio_marge_objectiu"),
      },
    },
    null,
    2,
  ),
);
