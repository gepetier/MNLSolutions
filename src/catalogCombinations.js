export function listCatalogCombinations(catalog) {
  return catalog.products.flatMap((product) =>
    product.cores.flatMap((core) =>
      core.thicknesses.flatMap((thickness) =>
        catalog.sheetGauge.options.flatMap((sheet) =>
          catalog.coatings.map((coating) =>
            buildCombination(catalog, {
              product,
              core,
              thickness,
              sheet,
              coating,
            }),
          ),
        ),
      ),
    ),
  );
}

export function createHoldedCombinationPayload(catalog, combination) {
  return {
    kind: "simple",
    name: combination.name,
    desc: combination.description,
    price: combination.unitPrice,
    cost: combination.unitPrice,
    purchasePrice: combination.unitPrice,
    taxes: [catalog.taxKey],
    sku: combination.sku,
    hasStock: false,
    tags: [
      "huurre",
      "panell",
      "cataleg-combinat",
      combination.productCode,
      combination.coreCode,
      `chapa-${combination.sheetCode}`,
      `recobriment-${combination.coatingCode}`,
    ],
  };
}

function buildCombination(catalog, { product, core, thickness, sheet, coating }) {
  const sheetDelta = calculateSheetDelta(catalog.sheetGauge, sheet);
  const coatingDelta = Number(coating.priceDelta || 0);
  const unitPrice = roundMoney(
    Number(thickness.basePrice) + sheetDelta + coatingDelta,
    catalog.rounding.unitPriceDecimals,
  );
  const sku = combinationSku(product.code, thickness.mm, core.code, sheet.code, coating.code);
  const name = `${product.name} ${thickness.mm} ${core.name} · Chapa ${sheet.name} · ${coating.name}`;

  return {
    sku,
    baseSku: baseSku(product.code, thickness.mm, core.code),
    name,
    description: [
      `${product.name} ${thickness.mm} ${core.name}`,
      `Chapa: ${sheet.name}`,
      `Recobriment: ${coating.name}`,
      `Preu base: ${formatNumber(thickness.basePrice)} EUR/m2`,
      `Ajust chapa: ${formatSigned(sheetDelta)} EUR/m2`,
      `Ajust recobriment: ${formatSigned(coatingDelta)} EUR/m2`,
    ].join("\n"),
    unit: catalog.unit,
    taxKey: catalog.taxKey,
    productCode: product.code,
    productName: product.name,
    coreCode: core.code,
    coreName: core.name,
    thicknessMm: Number(thickness.mm),
    sheetCode: sheet.code,
    sheetName: sheet.name,
    coatingCode: coating.code,
    coatingName: coating.name,
    basePrice: Number(thickness.basePrice),
    sheetDelta,
    coatingDelta,
    unitPrice,
  };
}

function calculateSheetDelta(sheetGauge, sheet) {
  return [sheet.outer, sheet.inner].reduce((total, gauge) => {
    if (Number(gauge) === 4) {
      return total - Number(sheetGauge.discountPerSideTo4 || 0);
    }
    if (Number(gauge) === 6) {
      return total + Number(sheetGauge.increasePerSideTo6 || 0);
    }
    return total;
  }, 0);
}

function baseSku(productCode, thicknessMm, coreCode) {
  return `${productCode}-${String(thicknessMm).padStart(3, "0")}-${coreCode}`;
}

function combinationSku(productCode, thicknessMm, coreCode, sheetCode, coatingCode) {
  return `${baseSku(productCode, thicknessMm, coreCode)}-${sheetCode}-${coatingCode}`;
}

function roundMoney(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function formatSigned(value) {
  if (Number(value) > 0) {
    return `+${formatNumber(value)}`;
  }
  return formatNumber(value);
}

function formatNumber(value) {
  return new Intl.NumberFormat("ca-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}
