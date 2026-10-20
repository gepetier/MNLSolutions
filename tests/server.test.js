import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import { createAppServer } from "../src/server.js";

const sample = JSON.parse(readFileSync(new URL("../examples/quote.sample.json", import.meta.url), "utf8"));

test("Smoke HTTP local: pàgina, catàleg i preview de pressupost sense Odoo", async (t) => {
  const server = createAppServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => { await new Promise((resolve) => server.close(resolve)); });
  const base = "http://127.0.0.1:" + server.address().port;

  const page = await fetch(base + "/");
  assert.equal(page.status, 200);
  assert.match(await page.text(), /<html/i);

  const productsResponse = await fetch(base + "/api/base-products");
  assert.equal(productsResponse.status, 200);
  assert.equal((await productsResponse.json()).length, 87);

  const previewResponse = await fetch(base + "/api/quote/preview", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(sample),
  });
  assert.equal(previewResponse.status, 200);
  const preview = await previewResponse.json();
  assert.equal(preview.quantity, 151.8);
  assert.equal(preview.subtotal, 3102.54);
});
