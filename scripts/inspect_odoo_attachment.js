import { requireConfig } from "../src/config.js";
import { OdooClient } from "../src/odooClient.js";

const client = new OdooClient(requireConfig());
const attachmentId = Number(process.argv[2]);
if (!attachmentId) throw new Error("Indica l'ID de l'adjunt.");

const fields = await client.call("ir.attachment", "fields_get", [], { attributes: ["type", "string"] });
const candidateFields = ["id", "name", "type", "url", "mimetype", "file_size", "checksum", "raw", "public"].filter((name) => fields[name]);
const [row] = await client.call(
  "ir.attachment",
  "read",
  [[attachmentId]],
  { fields: candidateFields },
);

console.log(JSON.stringify({
  ...row,
  raw: row?.raw ? `[base64 ${row.raw.length} chars]` : row?.raw,
  binaryFields: Object.entries(fields).filter(([, value]) => value.type === "binary").map(([name]) => name),
}, null, 2));
