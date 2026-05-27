export function listBaseProducts(catalog) {
  return catalog.products.flatMap((product) =>
    product.cores.flatMap((core) =>
      core.thicknesses.map((thickness) => ({
        sku: baseSku(product.code, thickness.mm, core.code),
        name: `${product.name} ${thickness.mm} ${core.name}`,
        productCode: product.code,
        productName: product.name,
        application: product.application || null,
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
  const quantity = calculateSquareMeters(input);
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
    dimensions: normalizeDimensions(input, quantity),
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
      application: product.application || null,
      core: core.name,
      thickness: `${thickness.mm} mm`,
      sheet: sheet.name,
      coating: coating.name,
    },
  };
}

export function createOdooProductTemplatePayload(catalog, baseProduct) {
  return {
    name: baseProduct.name,
    default_code: baseProduct.sku,
    list_price: baseProduct.basePrice,
    standard_price: baseProduct.basePrice,
    sale_ok: true,
    purchase_ok: false,
    description_sale: [baseProduct.name, baseProduct.application ? `Familia: ${baseProduct.application}` : null, "Producte base per configurador extern."]
      .filter(Boolean)
      .join("\n"),
  };
}

export function createOdooSaleOrderLine(line, productId) {
  const extraText = line.extras.length
    ? `\nExtres:\n${line.extras.map((extra) => `- ${extra.name}: ${extra.quantity} ${extra.unit}`).join("\n")}`
    : "";

  return {
    product_id: productId,
    product_uom_qty: line.quantity,
    price_unit: line.extrasSubtotal ? roundMoney(line.subtotal / line.quantity, 2) : line.unitPrice,
    name: `${line.name}\n${line.description}\nSKU configuracio: ${line.sku}${extraText}`,
  };
}

function calculateSquareMeters(input) {
  if (input.width !== undefined || input.length !== undefined || input.panelsQuantity !== undefined) {
    const width = positiveNumber(input.width, "amplada");
    const length = positiveNumber(input.length, "llargada");
    const panelsQuantity = positiveNumber(input.panelsQuantity || input.quantity || 1, "quantitat");
    return roundMoney(width * length * panelsQuantity, 4);
  }

  return positiveNumber(input.quantity || 1, "m2");
}

function normalizeDimensions(input, quantity) {
  if (input.width === undefined && input.length === undefined && input.panelsQuantity === undefined) {
    return { squareMeters: quantity };
  }

  return {
    width: Number(input.width),
    length: Number(input.length),
    panelsQuantity: Number(input.panelsQuantity || input.quantity || 1),
    squareMeters: quantity,
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
