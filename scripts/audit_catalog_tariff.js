import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { listBaseProducts } from "../src/catalogEngine.js";
import { readCatalog } from "../src/catalogStore.js";

const catalog = readCatalog();
const markdown = readFileSync(resolve(process.argv[2] || "docs/tarifa-huurre-master.md"), "utf8");

function section(start, end) {
  const from = markdown.indexOf(start);
  const to = end ? markdown.indexOf(end, from + start.length) : markdown.length;
  return markdown.slice(from, to === -1 ? markdown.length : to);
}

function moneyRows(text) {
  return [...text.matchAll(/^\|\s*([^|]+?)\s*\|\s*([+-]?\d+(?:\.\d+)?)\s+EUR\/([^|]+?)\s*\|$/gm)].map((match) => ({
    name: match[1].trim(),
    value: Number(match[2]),
    unit: match[3].trim(),
  }));
}

function mismatch(masterRows, actualRows) {
  const actual = new Map(actualRows.map((row) => [row.name, row]));
  const differences = [];
  for (const expected of masterRows) {
    const found = actual.get(expected.name);
    if (!found) {
      differences.push({ name: expected.name, issue: "missing", expected });
    } else if (Math.abs(found.value - expected.value) > 0.00001) {
      differences.push({ name: expected.name, issue: "value", expected: expected.value, actual: found.value });
    }
  }
  return differences;
}

const baseMaster = moneyRows(markdown.slice(0, markdown.indexOf("## Chapa base")));
const baseActual = listBaseProducts(catalog).map((row) => ({
  name: row.name.replace(/^Panell\s+/i, ""),
  value: Number(row.basePrice),
  unit: row.unit,
}));

const sheetMaster = moneyRows(section("## Chapa base", "## Extres"));
const sheetActual = (catalog.sheetGauge?.options || []).map((row) => ({
  name: row.name,
  value:
    [row.outer, row.inner].filter((value) => Number(value) === 6).length * Number(catalog.sheetGauge.increasePerSideTo6 || 0) -
    [row.outer, row.inner].filter((value) => Number(value) === 4).length * Number(catalog.sheetGauge.discountPerSideTo4 || 0),
  unit: "m2",
}));

const extraMaster = moneyRows(section("## Extres", "## Recargo Recubrimientos Especiales"));
const extraActual = (catalog.extras || []).map((row) => ({ name: row.name, value: Number(row.price), unit: row.unit }));

const coatingMaster = moneyRows(section("## Recargo Recubrimientos Especiales"));
const coatingActual = (catalog.coatings || [])
  .filter((row) => !row.default)
  .map((row) => ({ name: row.name, value: Number(row.priceDelta), unit: "m2" }));

const groups = {
  base: { masterCount: baseMaster.length, actualCount: baseActual.length, differences: mismatch(baseMaster, baseActual) },
  sheets: { masterCount: sheetMaster.length, actualCount: sheetActual.length, differences: mismatch(sheetMaster, sheetActual) },
  extras: { masterCount: extraMaster.length, actualCount: extraActual.length, differences: mismatch(extraMaster, extraActual) },
  coatings: { masterCount: coatingMaster.length, actualCount: coatingActual.length, differences: mismatch(coatingMaster, coatingActual) },
};

console.log(
  JSON.stringify(
    {
      source: resolve(process.argv[2] || "docs/tarifa-huurre-master.md"),
      ok: Object.values(groups).every((group) => group.differences.length === 0),
      groups,
      note: "El mestre de tarifa només enumera preus base de coberta; el catàleg també conté productes de façana.",
    },
    null,
    2,
  ),
);
