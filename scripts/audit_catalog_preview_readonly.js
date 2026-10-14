import { OdooClient } from "../src/odooClient.js";
import { requireConfig } from "../src/config.js";
import { readCatalog } from "../src/catalogStore.js";
import { buildOdooSyncPreview } from "../src/odooSync.js";

const client = new OdooClient(requireConfig());
await client.authenticate();
const preview = await buildOdooSyncPreview(client, readCatalog());

console.log(
  JSON.stringify(
    {
      database: client.database,
      mode: "read-only",
      counts: preview.counts,
      totalRows: preview.rows?.length || 0,
      nonMatchingSample: (preview.rows || []).filter((row) => row.action !== "unchanged").slice(0, 20),
    },
    null,
    2,
  ),
);
