import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const SENSITIVE_DATA_DIR = process.env.MNL_SENSITIVE_DATA_DIR || "Z:/Adri/Dades MNLSolutions";
const CONTACTS_PATH = resolve(SENSITIVE_DATA_DIR, "contacts.json");

export function readContactsPayload(path = CONTACTS_PATH) {
  if (!existsSync(path)) {
    return {
      generatedAt: null,
      sourceRoot: null,
      scannedFiles: 0,
      contactCount: 0,
      errorCount: 0,
      contacts: [],
      errors: [],
    };
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

export function readContacts(path = CONTACTS_PATH) {
  return readContactsPayload(path).contacts || [];
}

export function writeContactsPayload(payload, path = CONTACTS_PATH) {
  const next = {
    ...payload,
    contactCount: (payload.contacts || []).length,
  };
  writeFileSync(path, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

export function contactsToCsv(contacts) {
  const headers = [
    "name",
    "vat",
    "email",
    "phone",
    "phoneDigits",
    "street",
    "street2",
    "zip",
    "city",
    "province",
    "country",
    "cityLine",
    "quoteRefs",
    "invoiceRefs",
    "documentRefs",
    "sourceTypes",
    "odooId",
  ];
  const rows = contacts.map((contact) =>
    headers.map((header) => {
      const value = Array.isArray(contact[header]) ? contact[header].join("; ") : contact[header] || "";
      return csvCell(value);
    }),
  );
  return [[...headers], ...rows].map((row) => row.join(",")).join("\r\n");
}

function csvCell(value) {
  const text = String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}
