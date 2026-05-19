export function listBaseProducts(catalog) {
  return catalog.products.flatMap((product) =>
    product.cores.flatMap((core) =>
      core.thicknesses.map((thickness) => ({
        sku: baseSku(product.code, thickness.mm, core.code),
        name: `${product.name} ${thickness.mm} ${core.name}`,
        productCode: product.code,
        productName: product.name,
        coreCode: core.code,
        coreName: core.name,
        thicknessMm: thickness.mm,
        basePrice: thickness.basePrice,
        unit: catalog.unit,
        taxKey: catalog.taxKey,
      })),
    ),
  );
}

export function calculateQuoteLine(catalog, input) {
  const product = findByCode(catalog.products, input.productCode, "producte");
  const core = findByCode(product.cores, input.coreCode, "nucli");
  const thickness = core.thicknesses.find((item) => Number(item.mm) === Number(input.thicknessMm));
  if (!thickness) {
    throw new Error(`Gruix no trobat per ${product.code} ${core.code}: ${input.thicknessMm}`);
  }

  const sheet = findByCode(catalog.sheetGauge.options, input.sheetCode, "chapa");
  const coating = findByCode(catalog.coatings, input.coatingCode || "NONE", "recobriment");
  const quantity = positiveNumber(input.quantity || 1, "m2");
  const selectedExtras = normalizeExtras(catalog, input.extras || {});

  const sheetDelta = calculateSheetDelta(catalog.sheetGauge, sheet);
  const unitPrice = roundMoney(
    thickness.basePrice + sheetDelta + coating.priceDelta,
    catalog.rounding.unitPriceDecimals,
  );
  const panelSubtotal = roundMoney(unitPrice * quantity, catalog.rounding.lineDecimals);
  const extrasSubtotal = roundMoney(
    selectedExtras.reduce((total, extra) => total + extra.subtotal, 0),
    catalog.rounding.lineDecimals,
  );
  const subtotal = roundMoney(panelSubtotal + extrasSubtotal, catalog.rounding.lineDecimals);

  return {
    sku: configuredSku(product.code, thickness.mm, core.code, sheet.code, coating.code),
    baseSku: baseSku(product.code, thickness.mm, core.code),
    name: `${product.name} ${thickness.mm} ${core.name}`,
    description: `Chapa ${sheet.name} · ${coating.name}`,
    quantity,
    unit: catalog.unit,
    basePrice: thickness.basePrice,
    sheetDelta,
    coatingDelta: coating.priceDelta,
    unitPrice,
    panelSubtotal,
    extras: selectedExtras,
    extrasSubtotal,
    subtotal,
    options: {
      product: product.name,
      core: core.name,
      thickness: `${thickness.mm} mm`,
      sheet: sheet.name,
      coating: coating.name,
    },
  };
}

export function createHoldedProductPayload(catalog, baseProduct) {
  return {
    kind: "simple",
    name: baseProduct.name,
    desc: `${baseProduct.name}. Producte base per configurador extern.`,
    price: baseProduct.basePrice,
    cost: baseProduct.basePrice,
    purchasePrice: baseProduct.basePrice,
    taxes: [catalog.taxKey],
    sku: baseProduct.sku,
    hasStock: false,
    tags: ["cataleg-huurre", "configurador"],
  };
}

export function createHoldedDocumentItem(line) {
  const extraText = line.extras.length
    ? `\nExtres:\n${line.extras.map((extra) => `- ${extra.name}: ${extra.quantity} ${extra.unit}`).join("\n")}`
    : "";

  return {
    name: line.name,
    desc: `${line.description}\nSKU configuracio: ${line.sku}${extraText}`,
    units: line.quantity,
    subtotal: line.unitPrice,
    tax: 21,
  };
}

function normalizeExtras(catalog, extras) {
  return Object.entries(extras)
    .map(([code, rawQuantity]) => {
      const extra = findByCode(catalog.extras, code, "extra");
      const quantity = Number(rawQuantity || 0);
      if (!Number.isFinite(quantity) || quantity < 0) {
        throw new Error(`Quantitat invalida per ${extra.name}`);
      }
      return {
        code: extra.code,
        name: extra.name,
        unit: extra.unit,
        unitPrice: extra.price,
        quantity,
        subtotal: roundMoney(extra.price * quantity, catalog.rounding.lineDecimals),
      };
    })
    .filter((extra) => extra.quantity > 0);
}

function calculateSheetDelta(sheetGauge, sheet) {
  return [sheet.outer, sheet.inner].reduce((total, gauge) => {
    if (gauge === 4) {
      return total - sheetGauge.discountPerSideTo4;
    }
    if (gauge === 6) {
      return total + sheetGauge.increasePerSideTo6;
    }
    return total;
  }, 0);
}

function baseSku(productCode, thicknessMm, coreCode) {
  return `${productCode}-${String(thicknessMm).padStart(3, "0")}-${coreCode}`;
}

function configuredSku(productCode, thicknessMm, coreCode, sheetCode, coatingCode) {
  return `${baseSku(productCode, thicknessMm, coreCode)}-${sheetCode}-${coatingCode}`;
}

function findByCode(items, code, label) {
  const found = items.find((item) => item.code === code);
  if (!found) {
    throw new Error(`${label} no trobat: ${code}`);
  }
  return found;
}

function positiveNumber(value, label) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} ha de ser un numero positiu.`);
  }
  return parsed;
}

function roundMoney(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
