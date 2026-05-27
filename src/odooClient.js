export class OdooApiError extends Error {
  constructor(message, { body } = {}) {
    super(message);
    this.name = "OdooApiError";
    this.body = body;
  }
}

export class OdooClient {
  constructor({ url, database, username, apiKey, fetchImpl = fetch }) {
    if (!url || !database || !username || !apiKey) {
      throw new Error("OdooClient necessita url, database, username i apiKey.");
    }

    this.url = url.replace(/\/$/, "");
    this.database = database;
    this.username = username;
    this.apiKey = apiKey;
    this.fetch = fetchImpl;
    this.uid = null;
  }

  async authenticate() {
    if (this.uid) {
      return this.uid;
    }

    const response = await this.jsonRpc("common", "authenticate", [this.database, this.username, this.apiKey, {}]);

    if (!response) {
      throw new Error("Odoo no ha acceptat les credencials.");
    }

    this.uid = response;
    return this.uid;
  }

  async call(model, method, args = [], kwargs = {}) {
    await this.authenticate();
    return this.jsonRpc("object", "execute_kw", [this.database, this.uid, this.apiKey, model, method, args, kwargs]);
  }

  fieldsGet(model, fields) {
    return this.call(model, "fields_get", [fields], { attributes: ["type", "string", "selection"] });
  }

  searchRead(model, domain = [], fields = [], kwargs = {}) {
    return this.call(model, "search_read", [domain], { fields, ...kwargs });
  }

  create(model, values) {
    return this.call(model, "create", [values]);
  }

  write(model, ids, values) {
    return this.call(model, "write", [ids, values]);
  }

  unlink(model, ids) {
    return this.call(model, "unlink", [ids]);
  }

  async jsonRpc(service, method, args) {
    const response = await this.fetch(`${this.url}/jsonrpc`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "call",
        params: {
          service,
          method,
          args,
        },
        id: Date.now(),
      }),
    });

    const body = await response.json();
    if (!response.ok || body.error) {
      throw new OdooApiError(body.error?.data?.message || body.error?.message || `Odoo ha retornat HTTP ${response.status}`, {
        body,
      });
    }

    return body.result;
  }
}
