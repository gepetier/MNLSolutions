const JSON_METHODS = new Set(["POST", "PUT", "PATCH"]);

export class HoldedApiError extends Error {
  constructor(message, { status, statusText, body }) {
    super(message);
    this.name = "HoldedApiError";
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

export class HoldedClient {
  constructor({ apiKey, baseUrl = "https://api.holded.com/api", fetchImpl = fetch }) {
    if (!apiKey) {
      throw new Error("HoldedClient necessita una apiKey.");
    }

    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.fetch = fetchImpl;
  }

  async request(method, path, { query, body, headers } = {}) {
    const url = new URL(`${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`);

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null && value !== "") {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const requestHeaders = {
      accept: "application/json",
      key: this.apiKey,
      ...headers,
    };

    const init = {
      method,
      headers: requestHeaders,
    };

    if (body !== undefined) {
      if (JSON_METHODS.has(method.toUpperCase())) {
        requestHeaders["content-type"] = "application/json";
        init.body = JSON.stringify(body);
      } else {
        init.body = body;
      }
    }

    const response = await this.fetch(url, init);
    const responseBody = await parseResponse(response);

    if (!response.ok) {
      throw new HoldedApiError(`Holded API ha retornat ${response.status} ${response.statusText}`, {
        status: response.status,
        statusText: response.statusText,
        body: responseBody,
      });
    }

    return responseBody;
  }

  listContacts(query) {
    return this.request("GET", "/invoicing/v1/contacts", { query });
  }

  createContact(contact) {
    return this.request("POST", "/invoicing/v1/contacts", { body: contact });
  }

  updateContact(contactId, patch) {
    return this.request("PUT", `/invoicing/v1/contacts/${encodeURIComponent(contactId)}`, {
      body: patch,
    });
  }

  listProducts(query) {
    return this.request("GET", "/invoicing/v1/products", { query });
  }

  createProduct(product) {
    return this.request("POST", "/invoicing/v1/products", { body: product });
  }

  updateProduct(productId, patch) {
    return this.request("PUT", `/invoicing/v1/products/${encodeURIComponent(productId)}`, {
      body: patch,
    });
  }

  listDocuments(docType, query) {
    return this.request("GET", `/invoicing/v1/documents/${encodeURIComponent(docType)}`, {
      query,
    });
  }

  createDocument(docType, document) {
    return this.request("POST", `/invoicing/v1/documents/${encodeURIComponent(docType)}`, {
      body: document,
    });
  }

  sendDocument(docType, documentId, email) {
    return this.request(
      "POST",
      `/invoicing/v1/documents/${encodeURIComponent(docType)}/${encodeURIComponent(documentId)}/send`,
      { body: email },
    );
  }
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
