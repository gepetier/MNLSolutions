import { listCatalogCombinations } from "./catalogCombinations.js";
import { calculateQuoteLine, createOdooSaleOrderLine } from "./catalogEngine.js";

const ATTRIBUTES = {
  thickness: "Gruix",
  sheet: "Chapa",
  coating: "Recobriment",
};
const ROOT_CATEGORY = "Panells";

export async function buildOdooSyncPreview(client, catalog) {
  const localProducts = listCatalogCombinations(catalog);
  const remoteProducts = await listOdooCatalogVariants(client, localProducts);
  const remoteBySku = new Map(remoteProducts.filter((product) => product.default_code).map((product) => [product.default_code, product]));

  const rows = localProducts.map((local) => {
    const remote = remoteBySku.get(local.sku);
    if (!remote) {
      return row("create", local, null, ["missing-in-odoo"]);
    }

    const diffs = [];
    if (normalizeMoney(remote.price) !== normalizeMoney(local.unitPrice)) diffs.push("price");
    if (!String(remote.name || "").includes(local.productName)) diffs.push("name");

    return row(diffs.length ? "update" : "unchanged", local, remote, diffs);
  });

  const remoteOnly = remoteProducts
    .filter((product) => product.default_code && !localProducts.some((local) => local.sku === product.default_code))
    .map((product) => ({
      action: "odoo-only",
      sku: product.default_code,
      name: product.name,
      localPrice: null,
      remotePrice: normalizeMoney(product.price),
      remoteName: product.name,
      remoteId: product.id,
      diffs: ["not-in-local-catalog"],
    }));

  const allRows = [...rows, ...remoteOnly];
  return {
    generatedAt: new Date().toISOString(),
    mode: "odoo-templates-and-variants",
    templateCount: buildTemplateSpecs(catalog).length,
    localCount: localProducts.length,
    remoteCount: remoteProducts.length,
    counts: countActions(allRows),
    rows: allRows,
  };
}

export async function syncOdooProducts(client, catalog, { dryRun = true } = {}) {
  const preview = await buildOdooSyncPreview(client, catalog);
  if (dryRun) {
    return {
      dryRun,
      ...preview,
      plan: {
        categories: [ROOT_CATEGORY, "Coberta", "Facana"],
        attributes: Object.values(ATTRIBUTES),
        templates: buildTemplateSpecs(catalog).map((template) => template.code),
      },
    };
  }

  const fields = {
    template: await client.fieldsGet("product.template", []),
    product: await client.fieldsGet("product.product", []),
    attribute: await client.fieldsGet("product.attribute", []),
    templateAttributeValue: await client.fieldsGet("product.template.attribute.value", []),
  };
  const uom = await findM2Uom(client);
  const categories = await ensurePanelCategories(client);
  const attributes = await ensureAttributes(client, fields.attribute);
  const results = [];
  const pendingSkus = new Set(
    preview.rows.filter((item) => item.action === "create" || item.action === "update").map((item) => item.sku),
  );

  for (const template of buildTemplateSpecs(catalog)) {
    if (!template.variants.some((variant) => pendingSkus.has(variant.sku))) {
      const existingId = await findProductTemplateId(client, template);
      if (existingId) {
        results.push({
          template: template.code,
          templateId: existingId,
          variants: template.variants.length,
          skipped: true,
        });
      }
      continue;
    }

    const synced = await syncTemplate(client, template, {
      attributes,
      categories,
      fields,
      uom,
    });
    results.push(synced);
  }

  return {
    dryRun,
    counts: preview.counts,
    templates: results.length,
    variants: results.reduce((total, item) => total + item.variants, 0),
    results,
  };
}

export async function rollbackOdooProducts(client, rollbackPlan, { dryRun = true } = {}) {
  const templateIds = [...new Set((rollbackPlan.results || []).map((item) => item.templateId).filter(Boolean))];
  if (!templateIds.length) {
    throw new Error("El fitxer de rollback no conte cap templateId.");
  }

  const fields = await client.fieldsGet("product.template", []);
  if (!fields.active) {
    throw new Error("Aquest Odoo no exposa el camp active a product.template; no puc fer rollback segur arxivant.");
  }

  const templates = await client.searchRead("product.template", [["id", "in", templateIds]], ["id", "name", "default_code", "active"], {
    limit: templateIds.length + 10,
  });

  if (dryRun) {
    return {
      dryRun,
      templates: templates.length,
      rows: templates.map((template) => ({
        id: template.id,
        name: template.name,
        defaultCode: template.default_code,
        active: template.active,
      })),
    };
  }

  await client.write(
    "product.template",
    templates.map((template) => template.id),
    { active: false },
  );

  return {
    dryRun,
    archivedTemplates: templates.length,
    rows: templates.map((template) => ({
      id: template.id,
      name: template.name,
      defaultCode: template.default_code,
    })),
  };
}

export async function createTestSaleOrder(client, catalog, input) {
  const line = calculateQuoteLine(catalog, input.line);
  const partner = await findOrCreatePartner(client, input.partner || {});
  const product = await findProductVariantBySku(client, line.sku);
  if (!product) {
    throw new Error(`No trobo la variant a Odoo amb SKU ${line.sku}. Sincronitza el cataleg abans de crear el pressupost.`);
  }

  const orderLine = createOdooSaleOrderLine(line, product.id);
  if (input.line?.width && input.line?.length) {
    orderLine.name = `${orderLine.name}\nMides: ${input.line.width} x ${input.line.length} m x ${input.line.panelsQuantity || input.line.quantity || 1} = ${line.quantity} m2`;
  }

  const orderId = await client.create("sale.order", {
    partner_id: partner.id,
    client_order_ref: input.reference || "Pressupost de prova Odoo",
    order_line: [[0, 0, orderLine]],
  });

  const [order] = await client.searchRead("sale.order", [["id", "=", orderId]], ["id", "name", "amount_total", "partner_id"], { limit: 1 });
  return { order, line };
}

async function syncTemplate(client, template, { attributes, categories, fields, uom }) {
  const valueIds = {
    thickness: await ensureAttributeValues(client, attributes.thickness.id, template.thicknesses.map((item) => item.name)),
    sheet: await ensureAttributeValues(client, attributes.sheet.id, template.sheets.map((item) => item.name)),
    coating: await ensureAttributeValues(client, attributes.coating.id, template.coatings.map((item) => item.name)),
  };

  const templateId = await ensureProductTemplate(client, template, {
    category: categories[template.application] || categories.root,
    fields: fields.template,
    uom,
  });

  await ensureTemplateAttributeLine(client, templateId, attributes.thickness.id, valueIds.thickness.map((item) => item.id));
  await ensureTemplateAttributeLine(client, templateId, attributes.sheet.id, valueIds.sheet.map((item) => item.id));
  await ensureTemplateAttributeLine(client, templateId, attributes.coating.id, valueIds.coating.map((item) => item.id));

  await syncTemplatePriceExtras(client, templateId, attributes.thickness.id, valueIds.thickness, template.thicknesses, fields.templateAttributeValue);
  await syncTemplatePriceExtras(client, templateId, attributes.sheet.id, valueIds.sheet, template.sheets, fields.templateAttributeValue);
  await syncTemplatePriceExtras(client, templateId, attributes.coating.id, valueIds.coating, template.coatings, fields.templateAttributeValue);

  const variants = await syncVariantCodes(client, template, templateId, fields.product);
  return {
    template: template.code,
    templateId,
    variants,
  };
}

async function ensurePanelCategories(client) {
  const root = await ensureCategory(client, ROOT_CATEGORY);
  const coberta = await ensureCategory(client, "Coberta", root.id);
  const facana = await ensureCategory(client, "Facana", root.id);
  return { root, coberta, facana };
}

async function ensureCategory(client, name, parentId = false) {
  const domain = parentId ? [["name", "=", name], ["parent_id", "=", parentId]] : [["name", "=", name], ["parent_id", "=", false]];
  const [found] = await client.searchRead("product.category", domain, ["id", "name", "parent_id"], { limit: 1 });
  if (found) {
    return found;
  }
  const id = await client.create("product.category", {
    name,
    parent_id: parentId || false,
  });
  return { id, name, parent_id: parentId || false };
}

async function ensureAttributes(client, fields) {
  return {
    thickness: await ensureAttribute(client, ATTRIBUTES.thickness, fields),
    sheet: await ensureAttribute(client, ATTRIBUTES.sheet, fields),
    coating: await ensureAttribute(client, ATTRIBUTES.coating, fields),
  };
}

async function ensureAttribute(client, name, fields) {
  const [found] = await client.searchRead("product.attribute", [["name", "=", name]], ["id", "name"], { limit: 1 });
  if (found) {
    if (fields.create_variant) {
      await client.write("product.attribute", [found.id], { create_variant: "always" });
    }
    return found;
  }

  const values = { name };
  if (fields.create_variant) values.create_variant = "always";
  const id = await client.create("product.attribute", values);
  return { id, name };
}

async function ensureAttributeValues(client, attributeId, names) {
  const values = [];
  for (const name of names) {
    const [found] = await client.searchRead("product.attribute.value", [["attribute_id", "=", attributeId], ["name", "=", name]], ["id", "name"], {
      limit: 1,
    });
    if (found) {
      values.push(found);
    } else {
      const id = await client.create("product.attribute.value", { attribute_id: attributeId, name });
      values.push({ id, name });
    }
  }
  return values;
}

async function ensureProductTemplate(client, template, { category, fields, uom }) {
  const values = {
    name: template.name,
    default_code: template.code,
    categ_id: category.id,
    list_price: 0,
    sale_ok: true,
    purchase_ok: false,
    description_sale: template.description,
  };

  if (fields.detailed_type) values.detailed_type = "service";
  else if (fields.type) values.type = "service";
  if (uom && fields.uom_id) {
    values.uom_id = uom.id;
  }
  if (uom && fields.uom_po_id) {
    values.uom_po_id = uom.id;
  }

  const found = await findProductTemplate(client, template);
  if (found) {
    await client.write("product.template", [found.id], values);
    return found.id;
  }

  return client.create("product.template", values);
}

async function findProductTemplate(client, template) {
  const fields = ["id", "name", "default_code"];
  const [byCode] = await client.searchRead("product.template", [["default_code", "=", template.code]], fields, { limit: 1 });
  if (byCode) {
    return byCode;
  }
  const [byName] = await client.searchRead("product.template", [["name", "=", template.name]], fields, { limit: 1 });
  return byName || null;
}

async function findProductTemplateId(client, template) {
  const found = await findProductTemplate(client, template);
  return found?.id || null;
}

async function ensureTemplateAttributeLine(client, templateId, attributeId, valueIds) {
  const [line] = await client.searchRead(
    "product.template.attribute.line",
    [["product_tmpl_id", "=", templateId], ["attribute_id", "=", attributeId]],
    ["id", "value_ids"],
    { limit: 1 },
  );
  const values = { value_ids: [[6, 0, valueIds]] };
  if (line) {
    await client.write("product.template.attribute.line", [line.id], values);
    return line.id;
  }
  return client.create("product.template.attribute.line", {
    product_tmpl_id: templateId,
    attribute_id: attributeId,
    ...values,
  });
}

async function syncTemplatePriceExtras(client, templateId, attributeId, values, specs, fields) {
  if (!fields.price_extra) {
    return;
  }

  const ptavs = await client.searchRead(
    "product.template.attribute.value",
    [["product_tmpl_id", "=", templateId], ["attribute_id", "=", attributeId]],
    ["id", "price_extra", "product_attribute_value_id"],
    { limit: values.length + 10 },
  );
  const specByValueId = new Map(values.map((value, index) => [value.id, specs[index]]));

  for (const ptav of ptavs) {
    const valueId = many2OneId(ptav.product_attribute_value_id);
    const spec = specByValueId.get(valueId);
    if (!spec) continue;
    if (normalizeMoney(ptav.price_extra) !== normalizeMoney(spec.priceExtra)) {
      await client.write("product.template.attribute.value", [ptav.id], { price_extra: spec.priceExtra });
    }
  }
}

async function syncVariantCodes(client, template, templateId, fields) {
  const variantValueField = fields.product_template_variant_value_ids
    ? "product_template_variant_value_ids"
    : "product_template_attribute_value_ids";
  const variantFields = ["id", "name", "default_code", variantValueField];
  if (fields.standard_price) variantFields.push("standard_price");
  if (fields.description_sale) variantFields.push("description_sale");

  const ptavs = await client.searchRead(
    "product.template.attribute.value",
    [["product_tmpl_id", "=", templateId]],
    ["id", "attribute_id", "name"],
    { limit: 1000 },
  );
  const ptavById = new Map(ptavs.map((ptav) => [ptav.id, ptav]));
  const expectedByKey = new Map(template.variants.map((variant) => [variantKey(variant), variant]));
  const skuOwners = await client.searchRead(
    "product.product",
    [["default_code", "in", template.variants.map((variant) => variant.sku)]],
    ["id", "default_code", "product_tmpl_id"],
    { limit: template.variants.length + 50 },
  );
  const ownerBySku = new Map(skuOwners.map((owner) => [owner.default_code, owner]));

  const variants = await client.searchRead("product.product", [["product_tmpl_id", "=", templateId]], variantFields, { limit: template.variants.length + 50 });
  let updated = 0;

  for (const variant of variants) {
    const key = variantKeyFromOdooVariant(variant, variantValueField, ptavById);
    const expected = expectedByKey.get(key);
    if (!expected) continue;

    const values = {};
    if (variant.default_code !== expected.sku) {
      const owner = ownerBySku.get(expected.sku);
      if (owner && owner.id !== variant.id) {
        if (many2OneId(owner.product_tmpl_id) === templateId) {
          continue;
        }
        throw new Error(
          `El SKU ${expected.sku} ja existeix a Odoo en un altre producte (${many2OneName(owner.product_tmpl_id) || owner.id}). Revisa o arxiva el producte antic abans de sincronitzar variants.`,
        );
      }
      values.default_code = expected.sku;
    }
    if (fields.standard_price && normalizeMoney(variant.standard_price) !== normalizeMoney(expected.unitPrice)) {
      values.standard_price = expected.unitPrice;
    }
    if (fields.description_sale && variant.description_sale !== expected.description) {
      values.description_sale = expected.description;
    }
    if (Object.keys(values).length) {
      await client.write("product.product", [variant.id], values);
      updated += 1;
    }
  }

  return updated;
}

async function listOdooCatalogVariants(client, localProducts) {
  const skus = localProducts.map((product) => product.sku);
  if (!skus.length) {
    return [];
  }

  const fields = await client.fieldsGet("product.product", []);
  const priceField = fields.lst_price ? "lst_price" : fields.list_price ? "list_price" : null;
  const productFields = ["id", "name", "default_code"];
  if (priceField) productFields.push(priceField);

  const products = await client.searchRead("product.product", [["default_code", "in", skus]], productFields, { limit: skus.length + 100 });
  return products.map((product) => ({
    ...product,
    price: priceField ? product[priceField] : null,
  }));
}

async function findM2Uom(client) {
  const matches = await client.searchRead("uom.uom", [["name", "ilike", "m"]], ["id", "name"], { limit: 50 });
  return matches.find((uom) => ["m2", "m²", "m\u00b2"].includes(String(uom.name).toLowerCase())) || null;
}

async function findOrCreatePartner(client, partner) {
  const name = partner.name || "Client de prova";
  const domain = partner.email ? [["email", "=", partner.email]] : [["name", "=", name]];
  const [found] = await client.searchRead("res.partner", domain, ["id", "name", "email"], { limit: 1 });
  if (found) {
    return found;
  }
  const id = await client.create("res.partner", {
    name,
    email: partner.email || false,
    phone: partner.phone || false,
  });
  return { id, name, email: partner.email || false };
}

async function findProductVariantBySku(client, sku) {
  const [product] = await client.searchRead("product.product", [["default_code", "=", sku]], ["id", "name", "default_code"], { limit: 1 });
  return product || null;
}

function buildTemplateSpecs(catalog) {
  return catalog.products.flatMap((product) =>
    product.cores.map((core) => {
      const template = {
        code: `${product.code}-${core.code}`,
        name: `${product.name} ${core.name}`,
        productCode: product.code,
        productName: product.name,
        coreCode: core.code,
        coreName: core.name,
        application: product.application || "panells",
        description: [
          `${product.name} ${core.name}`,
          product.application ? `Familia: ${product.application}` : null,
          "Variants: gruix, chapa i recobriment.",
        ]
          .filter(Boolean)
          .join("\n"),
        thicknesses: core.thicknesses.map((thickness) => ({
          name: `${thickness.mm} mm`,
          thicknessMm: Number(thickness.mm),
          priceExtra: Number(thickness.basePrice),
        })),
        sheets: catalog.sheetGauge.options.map((sheet) => ({
          name: sheet.name,
          sheetCode: sheet.code,
          priceExtra: calculateSheetDelta(catalog.sheetGauge, sheet),
        })),
        coatings: catalog.coatings.map((coating) => ({
          name: coating.name,
          coatingCode: coating.code,
          priceExtra: Number(coating.priceDelta || 0),
        })),
      };
      template.variants = listCatalogCombinations({
        ...catalog,
        products: [{ ...product, cores: [core] }],
      });
      return template;
    }),
  );
}

function variantKey(variant) {
  return [variant.thicknessMm, variant.sheetName, variant.coatingName].join("|");
}

function variantKeyFromOdooVariant(variant, variantValueField, ptavById) {
  const parts = {
    [ATTRIBUTES.thickness]: null,
    [ATTRIBUTES.sheet]: null,
    [ATTRIBUTES.coating]: null,
  };

  for (const ptavId of variant[variantValueField] || []) {
    const ptav = ptavById.get(ptavId);
    if (!ptav) continue;
    const attributeName = many2OneName(ptav.attribute_id);
    if (Object.hasOwn(parts, attributeName)) {
      parts[attributeName] = ptav.name;
    }
  }

  return [Number(String(parts[ATTRIBUTES.thickness] || "").replace(/[^\d.]/g, "")), parts[ATTRIBUTES.sheet], parts[ATTRIBUTES.coating]].join("|");
}

function calculateSheetDelta(sheetGauge, sheet) {
  return [sheet.outer, sheet.inner].reduce((total, gauge) => {
    if (Number(gauge) === 4) return total - Number(sheetGauge.discountPerSideTo4 || 0);
    if (Number(gauge) === 6) return total + Number(sheetGauge.increasePerSideTo6 || 0);
    return total;
  }, 0);
}

function row(action, local, remote, diffs) {
  return {
    action,
    sku: local.sku,
    name: local.name,
    localPrice: local.unitPrice,
    remotePrice: remote ? normalizeMoney(remote.price) : null,
    remoteName: remote?.name || null,
    remoteId: remote?.id || null,
    diffs,
  };
}

function countActions(rows) {
  return rows.reduce(
    (counts, item) => {
      counts[item.action] = (counts[item.action] || 0) + 1;
      return counts;
    },
    { create: 0, update: 0, unchanged: 0, "odoo-only": 0 },
  );
}

function many2OneId(value) {
  return Array.isArray(value) ? value[0] : value;
}

function many2OneName(value) {
  return Array.isArray(value) ? value[1] : value;
}

function normalizeMoney(value) {
  const number = Number(value || 0);
  return Math.round((number + Number.EPSILON) * 100) / 100;
}
