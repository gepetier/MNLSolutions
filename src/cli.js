#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { requireConfig } from "./config.js";
import { HoldedApiError, HoldedClient } from "./holdedClient.js";

const DOC_TYPES = new Set([
  "invoice",
  "salesreceipt",
  "creditnote",
  "salesorder",
  "proform",
  "waybill",
  "estimate",
  "purchase",
  "purchaseorder",
  "purchaserefund",
]);

async function main() {
  const [command, ...args] = process.argv.slice(2);
  const client = new HoldedClient(requireConfig());

  switch (command) {
    case "ping":
      return print(await client.listContacts({ limit: 1 }));
    case "contacts:list":
      return print(await client.listContacts());
    case "contacts:create":
      return print(await client.createContact(readJsonArg(args[0])));
    case "products:list":
      return print(await client.listProducts());
    case "products:create":
      return print(await client.createProduct(readJsonArg(args[0])));
    case "documents:list":
      return print(await client.listDocuments(requireDocType(args[0]), parseQueryArgs(args.slice(1))));
    case "documents:create":
      return print(await client.createDocument(requireDocType(args[0]), readJsonArg(args[1])));
    case "documents:send":
      return print(
        await client.sendDocument(requireDocType(args[0]), requireArg(args[1], "documentId"), readJsonArg(args[2])),
      );
    default:
      usage();
      process.exitCode = command ? 1 : 0;
  }
}

function readJsonArg(filePath) {
  const value = requireArg(filePath, "fitxer JSON");
  const absolutePath = resolve(value);
  return JSON.parse(readFileSync(absolutePath, "utf8"));
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

function requireDocType(value) {
  const docType = requireArg(value, "docType");
  if (!DOC_TYPES.has(docType)) {
    throw new Error(`docType invalid: ${docType}`);
  }
  return docType;
}

function requireArg(value, label) {
  if (!value) {
    throw new Error(`Falta ${label}.`);
  }
  return value;
}

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

function usage() {
  console.log(`
Comandes:
  node src/cli.js ping
  node src/cli.js contacts:list
  node src/cli.js contacts:create examples/contact.sample.json
  node src/cli.js products:list
  node src/cli.js products:create examples/product.sample.json
  node src/cli.js documents:list invoice [starttmp=... endtmp=... paid=0]
  node src/cli.js documents:create invoice examples/invoice.sample.json
  node src/cli.js documents:send invoice <documentId> examples/send-document.sample.json
`);
}

main().catch((error) => {
  if (error instanceof HoldedApiError) {
    console.error(error.message);
    console.error(JSON.stringify(error.body, null, 2));
  } else {
    console.error(error.message);
  }
  process.exitCode = 1;
});
