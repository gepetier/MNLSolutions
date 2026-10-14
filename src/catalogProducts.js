export function listProductCores(catalog, product) {
  const source = sourceProduct(catalog, product);
  const delta = productPriceDelta(product);
  return (source.cores || []).map((core) => ({
    ...core,
    thicknesses: (core.thicknesses || []).map((thickness) => ({
      ...thickness,
      basePrice: roundMoney(Number(thickness.basePrice || 0) + delta, catalog.rounding?.unitPriceDecimals ?? 2),
      sourceBasePrice: Number(thickness.basePrice || 0),
      priceDelta: delta,
    })),
  }));
}

export function findProductCore(catalog, product, coreCode) {
  return listProductCores(catalog, product).find((core) => core.code === coreCode);
}

export function sourceProduct(catalog, product) {
  if (!product?.derivedFrom) {
    return product;
  }
  return catalog.products.find((item) => item.code === product.derivedFrom) || product;
}

export function productPriceDelta(product) {
  return Number(product?.priceDelta || 0);
}

export function isDerivedProduct(product) {
  return Boolean(product?.derivedFrom);
}

function roundMoney(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round((Number(value || 0) + Number.EPSILON) * factor) / factor;
}
