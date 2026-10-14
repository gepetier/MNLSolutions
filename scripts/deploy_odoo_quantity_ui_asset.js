import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

import { requireConfig } from "../src/config.js";
import { OdooClient } from "../src/odooClient.js";

const ASSET_NAME = "MNL - Configurator quantity bridge";
const ATTACHMENT_NAME = "mnl_configurator_quantity_bridge.js";
const ASSET_PATH = "/mnl/configurator_quantity_bridge.js";
const sourcePath = resolve("scripts/assets/configurator_quantity_bridge.js");
const source = await readFile(sourcePath);

const client = new OdooClient(requireConfig());
await client.authenticate();

const existingAssets = await client.searchRead(
  "ir.asset",
  [["name", "=", ASSET_NAME]],
  ["id", "path", "active"],
  { limit: 20 },
);

const existingAttachments = await client.searchRead(
  "ir.attachment",
  ["|", ["name", "=", ATTACHMENT_NAME], ["url", "=", ASSET_PATH]],
  ["id", "name", "mimetype", "public"],
  { limit: 20, order: "id desc" },
);

if (existingAssets.length) {
  await client.unlink("ir.asset", existingAssets.map(({ id }) => id));
}
if (existingAttachments.length) {
  await client.unlink("ir.attachment", existingAttachments.map(({ id }) => id));
}

const attachmentId = await client.create("ir.attachment", {
  name: ATTACHMENT_NAME,
  raw: source.toString("base64"),
  mimetype: "text/javascript",
  public: true,
  url: ASSET_PATH,
  res_model: "ir.ui.view",
  res_id: false,
  description: `Client-side bridge deployed from ${basename(sourcePath)}`,
});

const assetId = await client.create("ir.asset", {
  name: ASSET_NAME,
  bundle: "web.assets_backend",
  directive: "append",
  path: ASSET_PATH,
  active: true,
  sequence: 1000,
});

console.log(JSON.stringify({ attachmentId, assetId, path: ASSET_PATH }, null, 2));
