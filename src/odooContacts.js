function normalizePhone(value) {
  const digits = String(value || "").replace(/\D+/g, "");
  return digits.startsWith("34") && digits.length === 11 ? digits.slice(2) : digits;
}

export async function previewOdooContacts(client, contacts) {
  const partnerFields = await getPartnerFields(client);
  const partners = await loadOdooPartners(client, partnerFields);
  const rows = [];
  for (const contact of contacts) {
    const match = findOdooPartner(partners, contact);
    rows.push({
      action: match ? "exists" : "create",
      name: contact.name,
      vat: contact.vat || "",
      email: contact.email || "",
      phone: contact.phone || "",
      odooId: match?.id || null,
      odooName: match?.name || null,
      quoteRefs: contact.quoteRefs || [],
    });
  }
  return {
    generatedAt: new Date().toISOString(),
    counts: countActions(rows),
    rows,
  };
}

export async function syncOdooContacts(client, contacts) {
  const partnerFields = await getPartnerFields(client);
  const partners = await loadOdooPartners(client, partnerFields);
  const rows = [];
  for (const contact of contacts.filter((item) => item.selected !== false)) {
    const match = findOdooPartner(partners, contact);
    if (match) {
      rows.push({ action: "exists", name: contact.name, odooId: match.id, odooName: match.name });
      continue;
    }
    const values = contactToOdooValues(contact, partnerFields);
    const id = await client.create("res.partner", values);
    partners.push({ id, ...values });
    rows.push({ action: "create", name: contact.name, odooId: id, odooName: contact.name });
  }
  return {
    generatedAt: new Date().toISOString(),
    counts: countActions(rows),
    rows,
  };
}

async function getPartnerFields(client) {
  return client.fieldsGet("res.partner", []);
}

async function loadOdooPartners(client, partnerFields) {
  const fields = ["id", "name", "email", "phone"];
  if (partnerFields.vat) fields.push("vat");
  if (partnerFields.mobile) fields.push("mobile");
  return client.searchRead("res.partner", [], fields, { limit: 10000 });
}

function findOdooPartner(partners, contact) {
  if (contact.vat) {
    const found = partners.find((partner) => partner.vat === contact.vat);
    if (found) return found;
  }
  if (contact.email) {
    const email = contact.email.toLowerCase();
    const found = partners.find((partner) => String(partner.email || "").toLowerCase() === email);
    if (found) return found;
  }
  const phone = normalizePhone(contact.phone);
  if (phone) {
    const found = partners.find(
      (partner) => normalizePhone(partner.phone) === phone || normalizePhone(partner.mobile) === phone,
    );
    if (found) return found;
  }
  return partners.find((partner) => partner.name === contact.name) || null;
}

function contactToOdooValues(contact, partnerFields) {
  const phone = contact.phone || contact.phoneDigits || false;
  const comments = [
    "Importat des de documents MNL.",
    contactDocumentRefs(contact).length ? `Documents: ${contactDocumentRefs(contact).join(", ")}` : null,
    contact.sourceFiles?.length ? `Fonts: ${contact.sourceFiles.slice(0, 5).join("\n")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const values = {
    name: contact.name,
    email: contact.email || false,
    phone,
    street: contact.street || false,
    city: contact.city || contact.cityLine || false,
    comment: comments,
  };
  if (partnerFields.street2) values.street2 = contact.street2 || false;
  if (partnerFields.zip) values.zip = contact.zip || false;
  if (partnerFields.mobile && /^[67]/.test(normalizePhone(phone))) values.mobile = phone;
  if (partnerFields.vat) values.vat = contact.vat || false;
  if (partnerFields.customer_rank) values.customer_rank = 1;
  return values;
}

function contactDocumentRefs(contact) {
  return contact.documentRefs || contact.invoiceRefs || contact.quoteRefs || [];
}

function countActions(rows) {
  return rows.reduce(
    (counts, row) => {
      counts[row.action] = (counts[row.action] || 0) + 1;
      return counts;
    },
    { create: 0, exists: 0 },
  );
}
