import { privatePath } from "./private-path.js";
import { readFileSync } from "node:fs";
import { OdooClient } from "../../../src/odooClient.js";
import { requireConfig } from "../../../src/config.js";
import { previewOdooContacts } from "../../../src/odooContacts.js";

const source = JSON.parse(readFileSync(privatePath("contacts.json"), "utf8"));
const client = new OdooClient(requireConfig());
await client.authenticate();
const preview = await previewOdooContacts(client, source.contacts || []);
console.log(JSON.stringify({ database: client.database, sourceContacts: source.contacts?.length || 0, counts: preview.counts }));
