#!/usr/bin/env node
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { listCatalogCombinations } from "./catalogCombinations.js";
import { calculateQuoteLine, listBaseProducts } from "./catalogEngine.js";
import { readCatalog, writeCatalog } from "./catalogStore.js";
import { requireConfig } from "./config.js";
import { HoldedClient } from "./holdedClient.js";

const PORT = Number(process.env.PORT || 4173);
const APP_ROOT = process.env.HUURRE_APP_ROOT || resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_DIR = resolve(APP_ROOT, "public");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
};

export function createAppServer() {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host}`);

      if (request.method === "GET" && url.pathname === "/api/catalog") {
        return json(response, readCatalog());
      }

      if (request.method === "PUT" && url.pathname === "/api/catalog") {
        const catalog = await readJsonBody(request);
        writeCatalog(catalog);
        return json(response, { status: "saved" });
      }

      if (request.method === "GET" && url.pathname === "/api/base-products") {
        return json(response, listBaseProducts(readCatalog()));
      }

      if (request.method === "GET" && url.pathname === "/api/catalog-combinations") {
        return json(response, listCatalogCombinations(readCatalog()));
      }

      if (request.method === "GET" && url.pathname === "/api/holded/sync-preview") {
        return json(response, await buildHoldedSyncPreview());
      }

      if (request.method === "POST" && url.pathname === "/api/quote/preview") {
        return json(response, calculateQuoteLine(readCatalog(), await readJsonBody(request)));
      }

      if (request.method === "GET") {
        return serveStatic(url.pathname, response);
      }

      response.writeHead(405);
      response.end("Method not allowed");
    } catch (error) {
      json(response, { error: error.message }, 500);
    }
  });
}

export function startServer({ port = PORT, host = "127.0.0.1" } = {}) {
  const server = createAppServer();
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      const address = server.address();
      const actualPort = typeof address === "object" && address ? address.port : port;
      console.log(`MNLSavior: http://${host}:${actualPort}`);
      resolve({ server, port: actualPort, host, url: `http://${host}:${actualPort}` });
    });
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  startServer().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

function serveStatic(pathname, response) {
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const absolutePath = resolve(join(PUBLIC_DIR, relativePath));

  if (!absolutePath.startsWith(PUBLIC_DIR)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const content = readFileSync(absolutePath);
    response.writeHead(200, {
      "content-type": mimeTypes[extname(absolutePath)] || "application/octet-stream",
      "cache-control": "no-store",
    });
    response.end(content);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function json(response, value, status = 200) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(value, null, 2));
}

async function buildHoldedSyncPreview() {
  const catalog = readCatalog();
  const localProducts = listBaseProducts(catalog);
  const holded = new HoldedClient(requireConfig());
  const holdedProducts = await holded.listProducts();
  const holdedBySku = new Map(holdedProducts.filter((product) => product.sku).map((product) => [product.sku, product]));

  const rows = localProducts.map((local) => {
    const remote = holdedBySku.get(local.sku);
    if (!remote) {
      return {
        action: "create",
        sku: local.sku,
        name: local.name,
        localPrice: local.basePrice,
        holdedPrice: null,
        holdedName: null,
        holdedId: null,
        diffs: ["missing-in-holded"],
      };
    }

    const diffs = [];
    if (normalizeMoney(remote.price) !== normalizeMoney(local.basePrice)) {
      diffs.push("price");
    }
    if ((remote.name || "") !== local.name) {
      diffs.push("name");
    }

    return {
      action: diffs.length ? "update" : "unchanged",
      sku: local.sku,
      name: local.name,
      localPrice: local.basePrice,
      holdedPrice: normalizeMoney(remote.price),
      holdedName: remote.name,
      holdedId: remote.id,
      diffs,
    };
  });

  const holdedOnly = holdedProducts
    .filter((product) => product.sku && !localProducts.some((local) => local.sku === product.sku))
    .map((product) => ({
      action: "holded-only",
      sku: product.sku,
      name: product.name,
      localPrice: null,
      holdedPrice: normalizeMoney(product.price),
      holdedName: product.name,
      holdedId: product.id,
      diffs: ["not-in-local-catalog"],
    }));

  const allRows = [...rows, ...holdedOnly];
  const counts = countActions(allRows);

  return {
    version: createCatalogVersion(catalog),
    generatedAt: new Date().toISOString(),
    localCount: localProducts.length,
    holdedCount: holdedProducts.length,
    counts,
    rows: allRows,
  };
}

function normalizeMoney(value) {
  const number = Number(value || 0);
  return Math.round((number + Number.EPSILON) * 100) / 100;
}

function countActions(rows) {
  return rows.reduce(
    (counts, row) => {
      counts[row.action] = (counts[row.action] || 0) + 1;
      return counts;
    },
    { create: 0, update: 0, unchanged: 0, "holded-only": 0 },
  );
}

function createCatalogVersion(catalog) {
  const hash = createHash("sha1").update(JSON.stringify(catalog)).digest("hex").slice(0, 8);
  return `tarifa-${new Date().toISOString().slice(0, 10)}-${hash}`;
}
