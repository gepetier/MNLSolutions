import { requireConfig } from "../src/config.js";
import { OdooClient } from "../src/odooClient.js";

const client = new OdooClient(requireConfig());
const rows = await client.searchRead(
  "ir.attachment",
  [["url", "ilike", "/web/assets/"], ["name", "ilike", "web.assets_web.min.js"]],
  ["id", "name", "url", "file_size", "raw", "write_date"],
  { limit: 10, order: "id desc" },
);

console.log(JSON.stringify(rows.map((row) => {
  const decoded = row.raw ? Buffer.from(row.raw, "base64").toString("utf8") : "";
  const marker = "__mnlConfiguratorQuantityBridge";
  const index = decoded.indexOf(marker);
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    file_size: row.file_size,
    write_date: row.write_date,
    markerIndex: index,
    excerpt: index >= 0 ? decoded.slice(Math.max(0, index - 500), index + 1200) : "",
  };
}), null, 2));
