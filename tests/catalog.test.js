import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { listCatalogCombinations, createOdooCombinationPayload } from "../src/catalogCombinations.js";
import { calculateQuoteLine, createOdooSaleOrderLine, listBaseProducts } from "../src/catalogEngine.js";

const catalog = JSON.parse(readFileSync(new URL("../data/catalog.json", import.meta.url), "utf8"));
const sample = JSON.parse(readFileSync(new URL("../examples/quote.sample.json", import.meta.url), "utf8"));

test("El catàleg genera 87 bases i 5.220 variants, totes amb SKU únic", () => {
  const bases = listBaseProducts(catalog);
  const combinations = listCatalogCombinations(catalog);
  assert.equal(bases.length, 87);
  assert.equal(combinations.length, 5220);
  assert.equal(new Set(bases.map((base) => base.sku)).size, bases.length);
  assert.equal(new Set(combinations.map((item) => item.sku)).size, combinations.length);
});

test("Pressupost fictici: dimensions, preus, extres i total reproduïbles", () => {
  const line = calculateQuoteLine(catalog, sample);
  assert.equal(line.sku, "HI-CT-040-PIR-55-HDS");
  assert.equal(line.quantity, 151.8);
  assert.deepEqual(line.dimensions, { width: 1.15, length: 6, panelsQuantity: 22, squareMeters: 151.8 });
  assert.equal(line.unitPrice, 20.3);
  assert.equal(line.panelSubtotal, 3081.54);
  assert.equal(line.extrasSubtotal, 21);
  assert.equal(line.subtotal, 3102.54);
});

test("Chapes, preus per unitat i payload Odoo sense extres", () => {
  const line = calculateQuoteLine(catalog, {
    productCode: "HI-CT", coreCode: "PIR", thicknessMm: 40,
    sheetCode: "66", coatingCode: "NONE", quantity: 2,
  });
  assert.equal(line.quantity, 2);
  assert.deepEqual(line.dimensions, { squareMeters: 2 });
  assert.equal(line.unitPrice, 20.95);
  assert.equal(line.subtotal, 41.9);
  const payload = createOdooSaleOrderLine(line, 123);
  assert.equal(payload.product_id, 123);
  assert.equal(payload.product_uom_qty, 2);
  assert.equal(payload.price_unit, 20.95);
});

test("Els productes derivats conserven el recàrrec de preu", () => {
  const base = calculateQuoteLine(catalog, {
    productCode: "HI-ST", coreCode: "PIR", thicknessMm: 40,
    sheetCode: "55", coatingCode: "NONE", quantity: 1,
  });
  const derivative = calculateQuoteLine(catalog, {
    productCode: "HI-STM", coreCode: "PIR", thicknessMm: 40,
    sheetCode: "55", coatingCode: "NONE", quantity: 1,
  });
  assert.equal(base.unitPrice, 20.2);
  assert.equal(derivative.unitPrice, 20.55);
});

test("El catàleg genera payloads compatibles per a les variants", () => {
  const combination = listCatalogCombinations(catalog).find((item) => item.sku === "HI-CT-040-PIR-55-HDS");
  assert.ok(combination);
  assert.equal(combination.unitPrice, 20.3);
  const payload = createOdooCombinationPayload(catalog, combination);
  assert.equal(payload.default_code, combination.sku);
  assert.equal(payload.list_price, combination.unitPrice);
  assert.equal(payload.sale_ok, true);
});

test("Es rebutgen productes, dimensions i quantitats invàlides", () => {
  assert.throws(() => calculateQuoteLine(catalog, { ...sample, productCode: "INEXISTENT" }), /no trobat/);
  assert.throws(() => calculateQuoteLine(catalog, { ...sample, width: -1 }), /positiu/);
  assert.throws(() => calculateQuoteLine(catalog, { ...sample, length: undefined }), /positiu/);
  assert.throws(() => calculateQuoteLine(catalog, { ...sample, extras: { "SOLAPE-FILM": -4 } }), /invalida/);
});
