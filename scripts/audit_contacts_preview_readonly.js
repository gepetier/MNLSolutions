import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { OdooClient } from "../src/odooClient.js";
import { requireConfig } from "../src/config.js";
import { previewOdooContacts } from "../src/odooContacts.js";

const source = resolve(process.argv[2] || "tmp-invoice-contacts.json");
const payload = JSON.parse(readFileSync(source, "utf8"));
const client = new OdooClient(requireConfig());
await client.authenticate();
const preview = await previewOdooContacts(client, payload.contacts || []);

console.log(
  JSON.stringify(
    {
      database: client.database,
      source,
      sourceContacts: (payload.contacts || []).length,
      counts: preview.counts,
      unmatchedSample: preview.rows.filter((row) => row.action === "create").slice(0, 20),
    },
    null,
    2,
  ),
);
