import { privatePath } from "./private-path.js";
import { readFileSync } from "node:fs";

const contacts = JSON.parse(readFileSync(privatePath("contacts.json"), "utf8")).contacts;
const byVat = new Map();
const byName = new Map();
for (const contact of contacts) {
  if (contact.vat) {
    const vat = contact.vat.replace(/[^A-Z0-9]/gi, "").toUpperCase();
    byVat.set(vat, [...(byVat.get(vat) || []), contact.name]);
  }
  const key = contact.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  byName.set(key, [...(byName.get(key) || []), contact.name]);
}
console.log(JSON.stringify({
  duplicateVat: [...byVat.values()].filter((list) => list.length > 1),
  duplicateNormalizedName: [...byName.values()].filter((list) => list.length > 1),
  missingVat: contacts.filter((c) => !c.vat).map((c) => c.name),
}, null, 2));
