import { privatePath } from "./private-path.js";
import { readFileSync, appendFileSync } from "node:fs";
import { OdooClient } from "../../../src/odooClient.js";
import { requireConfig } from "../../../src/config.js";
import { previewOdooContacts, syncOdooContacts } from "../../../src/odooContacts.js";

const expectedDatabase = process.argv[2];
if (!expectedDatabase || process.argv[3] !== "--apply") {
  throw new Error("Cal indicar la base esperada i --apply.");
}
const excluded = new Set(JSON.parse(readFileSync(privatePath("contact-exclusions.json"), "utf8")));
const source = JSON.parse(readFileSync(privatePath("contacts.json"), "utf8"));
const contacts = source.contacts.filter((contact) => !excluded.has(contact.name)).map((contact) => ({
  ...contact,
  sourceFiles: [],
}));
if (source.contacts.length !== 345 || contacts.length !== 342) {
  throw new Error(`Mida del lot inesperada: ${source.contacts.length} / ${contacts.length}.`);
}
const client = new OdooClient(requireConfig());
if (client.database !== expectedDatabase) {
  throw new Error(`Base inesperada: ${client.database}`);
}
await client.authenticate();
const before = await previewOdooContacts(client, contacts);
console.log(JSON.stringify({ phase: "before", database: client.database, counts: before.counts }));
const logPath = privatePath(`contact-upload-${client.database}-${Date.now()}.jsonl`);
appendFileSync(logPath, JSON.stringify({ phase: "start", database: client.database, sourceCount: contacts.length, before: before.counts }) + "\n");
let created = 0;
let existing = 0;
for (let i = 0; i < contacts.length; i += 25) {
  const batch = contacts.slice(i, i + 25);
  const result = await syncOdooContacts(client, batch);
  created += result.counts.create;
  existing += result.counts.exists;
  appendFileSync(logPath, JSON.stringify({ phase: "batch", start: i + 1, end: i + batch.length, counts: result.counts, ids: result.rows.filter((row) => row.action === "create").map((row) => row.odooId) }) + "\n");
  console.log(JSON.stringify({ phase: "batch", processed: i + batch.length, created, existing }));
}
const after = await previewOdooContacts(client, contacts);
appendFileSync(logPath, JSON.stringify({ phase: "after", counts: after.counts }) + "\n");
console.log(JSON.stringify({ phase: "after", database: client.database, sourceCount: contacts.length, counts: after.counts, logPath }));
if (after.counts.exists !== 342 || after.counts.create !== 0) {
  process.exitCode = 1;
}
