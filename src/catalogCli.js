#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { listCatalogCombinations, createOdooCombinationPayload } from "./catalogCombinations.js";
import { calculateQuoteLine, createOdooProductTemplatePayload, listBaseProducts } from "./catalogEngine.js";
import { readCatalog } from "./catalogStore.js";

const [command, ...args] = process.argv.slice(2);
const catalog = readCatalog();

try {
  switch (command) {
    case "base:list":
      print(listBaseProducts(catalog));
      break;
    case "base:payloads":
      print(listBaseProducts(catalog).map((product) => createOdooProductTemplatePayload(catalog, product)));
      break;
    case "quote":
      print(calculateQuoteLine(catalog, normalizeQuoteInput(readJson(args[0]))));
      break;
    case "combinations:count": {
      const combinations = listCatalogCombinations(catalog);
      print({
        count: combinations.length,
        baseProducts: listBaseProducts(catalog).length,
        sheets: catalog.sheetGauge.options.length,
        coatings: catalog.coatings.length,
      });
      break;
    }
    case "combinations:list":
      print(filterCombinations(listCatalogCombinations(catalog), parseQueryArgs(args)));
      break;
    case "combinations:payloads":
      print(
        filterCombinations(listCatalogCombinations(catalog), parseQueryArgs(args)).map((combination) =>
          createOdooCombinationPayload(catalog, combination),
        ),
      );
      break;
    default:
      usage();
      process.exitCode = command ? 1 : 0;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

function readJson(path) {
  if (!path) {
    throw new Error("Falta el fitxer JSON de configuracio.");
  }
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

function normalizeQuoteInput(value) {
  return value.line || value;
}

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

function parseQueryArgs(args) {
  return Object.fromEntries(
    args.map((arg) => {
      const separator = arg.indexOf("=");
      if (separator === -1) {
        throw new Error(`Parametre invalid: ${arg}. Fes servir clau=valor.`);
      }
      return [arg.slice(0, separator), arg.slice(separator + 1)];
    }),
  );
}

function filterCombinations(combinations, filters) {
  return combinations.filter((combination) =>
    Object.entries(filters).every(([key, value]) => String(combination[key]) === value),
  );
}

function usage() {
  console.log(`
Comandes cataleg:
  node src/catalogCli.js base:list
  node src/catalogCli.js base:payloads
  node src/catalogCli.js quote examples/quote.sample.json
  node src/catalogCli.js combinations:count
  node src/catalogCli.js combinations:list productCode=HI-CT coreCode=PIR thicknessMm=60
  node src/catalogCli.js combinations:payloads productCode=HI-CT coreCode=PIR thicknessMm=60 sheetCode=56
`);
}
