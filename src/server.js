#!/usr/bin/env node
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { listCatalogCombinations } from "./catalogCombinations.js";
import { calculateQuoteLine, listBaseProducts } from "./catalogEngine.js";
import { readCatalog, writeCatalog } from "./catalogStore.js";
import { requireConfig } from "./config.js";
import { OdooClient } from "./odooClient.js";
import { buildOdooSyncPreview } from "./odooSync.js";

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

      if (request.method === "GET" && url.pathname === "/api/odoo/sync-preview") {
        return json(response, await buildOdooSyncPreview(new OdooClient(requireConfig()), readCatalog()));
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
      console.log(`MNL Odoo Sync: http://${host}:${actualPort}`);
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
