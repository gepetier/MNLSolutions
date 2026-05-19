let catalog;
let editBaseline;
let baseProducts = [];
let combinations = [];
let budgetLines = [];
let syncMode = "base";
let lastLine;
let saveTimer;
let apiAvailable = true;

const STORAGE_KEY = "huurre-catalog-v1";

const els = {
  tabs: [...document.querySelectorAll(".tab")],
  panels: [...document.querySelectorAll(".tab-panel")],
  form: document.querySelector("#quoteForm"),
  status: document.querySelector("#status"),
  developerMode: document.querySelector("#developerMode"),
  baseCount: document.querySelector("#baseCount"),
  catalogGroups: document.querySelector("#catalogGroups"),
  catalogProductFilter: document.querySelector("#catalogProductFilter"),
  catalogSearch: document.querySelector("#catalogSearch"),
  productEditor: document.querySelector("#productEditor"),
  modifierEditor: document.querySelector("#modifierEditor"),
  extrasPicker: document.querySelector("#extrasPicker"),
  openCreateFlow: document.querySelector("#openCreateFlow"),
  createDialog: document.querySelector("#createDialog"),
  createForm: document.querySelector("#createForm"),
  createSubmit: document.querySelector("#createSubmit"),
  unitPrice: document.querySelector("#unitPrice"),
  panelSubtotal: document.querySelector("#panelSubtotal"),
  extrasSubtotal: document.querySelector("#extrasSubtotal"),
  subtotal: document.querySelector("#subtotal"),
  quotePreview: document.querySelector("#quotePreview"),
  refreshSync: document.querySelector("#refreshSync"),
  syncSegments: [...document.querySelectorAll("[data-sync-mode]")],
  baseSyncSummary: document.querySelector("#baseSyncSummary"),
  generateLocalCatalog: document.querySelector("#generateLocalCatalog"),
  exportLocalCatalog: document.querySelector("#exportLocalCatalog"),
  localCatalogStatus: document.querySelector("#localCatalogStatus"),
  localCatalogTotal: document.querySelector("#localCatalogTotal"),
  localCatalogBases: document.querySelector("#localCatalogBases"),
  localCatalogVariants: document.querySelector("#localCatalogVariants"),
  localCatalogBreakdown: document.querySelector("#localCatalogBreakdown"),
  combinationPreview: document.querySelector("#combinationPreview"),
  combinationCount: document.querySelector("#combinationCount"),
  combinationTable: document.querySelector("#combinationTable"),
  comboProductFilter: document.querySelector("#comboProductFilter"),
  comboCoreFilter: document.querySelector("#comboCoreFilter"),
  comboSheetFilter: document.querySelector("#comboSheetFilter"),
  comboCoatingFilter: document.querySelector("#comboCoatingFilter"),
  comboSearch: document.querySelector("#comboSearch"),
  syncVersion: document.querySelector("#syncVersion"),
  syncCreate: document.querySelector("#syncCreate"),
  syncUpdate: document.querySelector("#syncUpdate"),
  syncUnchanged: document.querySelector("#syncUnchanged"),
  syncHoldedOnly: document.querySelector("#syncHoldedOnly"),
  syncTable: document.querySelector("#syncTable"),
  openTabButtons: [...document.querySelectorAll("[data-open-tab]")],
  budgetStatus: document.querySelector("#budgetStatus"),
  holdedQuoteSearch: document.querySelector("#holdedQuoteSearch"),
  loadHoldedQuote: document.querySelector("#loadHoldedQuote"),
  newBudget: document.querySelector("#newBudget"),
  budgetLineForm: document.querySelector("#budgetLineForm"),
  budgetLinePrice: document.querySelector("#budgetLinePrice"),
  addBudgetLine: document.querySelector("#addBudgetLine"),
  budgetRows: document.querySelector("#budgetRows"),
  budgetTotal: document.querySelector("#budgetTotal"),
};

catalog = await loadCatalog();
editBaseline = structuredClone(catalog);
renderTabs();
renderSelectorsFromUrl();
renderCatalogFilters();
renderExtrasPicker();
await refreshBaseProducts();
renderEditors();
setupCreateFlow();
setupBudgeter();
setDeveloperMode(false);
await refreshQuote();

els.form.addEventListener("input", refreshQuote);
els.developerMode.addEventListener("change", () => setDeveloperMode(els.developerMode.checked));
els.catalogProductFilter.addEventListener("input", renderCatalog);
els.catalogSearch.addEventListener("input", renderCatalog);
els.refreshSync.addEventListener("click", refreshSyncPreview);
els.generateLocalCatalog.addEventListener("click", generateLocalCatalog);
els.exportLocalCatalog.addEventListener("click", exportLocalCatalog);
for (const segment of els.syncSegments) {
  segment.addEventListener("click", () => setSyncMode(segment.dataset.syncMode));
}
for (const filter of [
  els.comboProductFilter,
  els.comboSheetFilter,
  els.comboCoatingFilter,
  els.comboSearch,
]) {
  filter.addEventListener("input", renderCombinationPreview);
}
els.comboProductFilter.addEventListener("input", () => {
  renderCombinationCoreFilter();
  renderCombinationPreview();
});
els.comboCoreFilter.addEventListener("input", renderCombinationPreview);
els.openCreateFlow.addEventListener("click", openCreateDialog);
els.createSubmit.addEventListener("click", createItemFromDialog);

function renderTabs() {
  for (const tab of els.tabs) {
    tab.addEventListener("click", () => activateTab(tab.dataset.tab));
  }
  for (const button of els.openTabButtons) {
    button.addEventListener("click", () => activateTab(button.dataset.openTab));
  }
}

function activateTab(tabName) {
  for (const item of els.tabs) {
    item.classList.toggle("active", item.dataset.tab === tabName);
  }
  for (const panel of els.panels) {
    panel.classList.toggle("active", panel.id === `${tabName}Tab`);
  }
}

function renderSelectorsFromUrl() {
  const params = new URLSearchParams(window.location.search);
  setOptions(els.form.productCode, catalog.products, "code", "name", params.get("productCode"));
  renderCoreOptions(params.get("coreCode"));
  renderThicknessOptions(params.get("thicknessMm"));
  setOptions(els.form.sheetCode, catalog.sheetGauge.options, "code", "name", params.get("sheetCode"));
  setOptions(els.form.coatingCode, catalog.coatings, "code", "name", params.get("coatingCode"));
  if (params.get("quantity")) {
    els.form.quantity.value = params.get("quantity");
  }

  els.form.productCode.onchange = () => {
    renderCoreOptions();
    renderThicknessOptions();
    refreshQuote();
  };
  els.form.coreCode.onchange = () => {
    renderThicknessOptions();
    refreshQuote();
  };
}

function renderCoreOptions(selectedValue) {
  const product = selectedProduct();
  setOptions(els.form.coreCode, product.cores, "code", "name", selectedValue);
}

function renderThicknessOptions(selectedValue) {
  const core = selectedCore();
  els.form.thicknessMm.innerHTML = "";
  for (const thickness of core.thicknesses) {
    const option = document.createElement("option");
    option.value = thickness.mm;
    option.textContent = `${thickness.mm} mm`;
    els.form.thicknessMm.append(option);
  }
  if (selectedValue && [...els.form.thicknessMm.options].some((option) => option.value === selectedValue)) {
    els.form.thicknessMm.value = selectedValue;
  }
}

function renderCatalogFilters() {
  els.catalogProductFilter.innerHTML = '<option value="">Tots els panells</option>';
  for (const product of catalog.products) {
    const option = document.createElement("option");
    option.value = product.code;
    option.textContent = product.name;
    els.catalogProductFilter.append(option);
  }
}

function renderCombinationFilters() {
  setFilterOptions(els.comboProductFilter, catalog.products.map((product) => [product.code, product.name]), "Tots");
  renderCombinationCoreFilter();
  setFilterOptions(els.comboSheetFilter, catalog.sheetGauge.options.map((sheet) => [sheet.code, sheet.name]), "Totes");
  setFilterOptions(els.comboCoatingFilter, catalog.coatings.map((coating) => [coating.code, coating.name]), "Tots");
}

function renderCombinationCoreFilter() {
  const productCode = els.comboProductFilter.value;
  const cores = catalog.products
    .filter((product) => !productCode || product.code === productCode)
    .flatMap((product) => product.cores)
    .filter((core, index, all) => all.findIndex((item) => item.code === core.code) === index);
  setFilterOptions(els.comboCoreFilter, cores.map((core) => [core.code, core.name]), "Tots");
}

function setFilterOptions(select, options, allLabel) {
  const previous = select.value;
  select.innerHTML = `<option value="">${allLabel}</option>`;
  for (const [value, label] of options) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.append(option);
  }
  if ([...select.options].some((option) => option.value === previous)) {
    select.value = previous;
  }
}

async function refreshBaseProducts() {
  baseProducts = apiAvailable ? await getJson("/api/base-products") : buildBaseProductsFromCatalog();
  els.baseCount.textContent = `${baseProducts.length} bases`;
  renderCatalog();
}

async function refreshCombinations() {
  combinations = apiAvailable ? await getJson("/api/catalog-combinations") : buildCombinationsFromCatalog();
  renderCombinationFilters();
  renderCombinationPreview();
  renderLocalCatalogSummary();
}

async function generateLocalCatalog() {
  els.localCatalogStatus.textContent = "Generant...";
  els.generateLocalCatalog.disabled = true;
  try {
    await refreshCombinations();
    await setSyncMode("combinations");
    els.localCatalogStatus.textContent = "Generat";
    els.exportLocalCatalog.disabled = !combinations.length;
  } catch (error) {
    els.localCatalogStatus.textContent = "Error";
    els.localCatalogBreakdown.innerHTML = `<div class="empty-state error">${escapeHtml(error.message)}</div>`;
  } finally {
    els.generateLocalCatalog.disabled = false;
  }
}

function renderLocalCatalogSummary() {
  const baseCount = new Set(combinations.map((item) => item.baseSku || `${item.productCode}-${item.thicknessMm}-${item.coreCode}`)).size;
  const variantCount = catalog.sheetGauge.options.length * catalog.coatings.length;
  els.localCatalogTotal.textContent = String(combinations.length);
  els.localCatalogBases.textContent = String(baseCount);
  els.localCatalogVariants.textContent = `${catalog.sheetGauge.options.length} x ${catalog.coatings.length} = ${variantCount}`;
  els.exportLocalCatalog.disabled = !combinations.length;

  if (!combinations.length) {
    els.localCatalogBreakdown.innerHTML = '<div class="empty-state">Encara no s\'ha generat el cataleg local.</div>';
    return;
  }

  const groups = groupBy(combinations, (item) => item.productCode);
  els.localCatalogBreakdown.innerHTML = [...groups.entries()]
    .map(([productCode, rows]) => {
      const product = catalog.products.find((item) => item.code === productCode);
      const min = Math.min(...rows.map((item) => item.unitPrice));
      const max = Math.max(...rows.map((item) => item.unitPrice));
      return `
        <div class="local-catalog-chip" data-product="${escapeHtml(productCode)}">
          <strong>${escapeHtml(product?.name || productCode)}</strong>
          <span>${rows.length} articles · ${money(min)} - ${money(max)}/m2</span>
        </div>
      `;
    })
    .join("");
}

function exportLocalCatalog() {
  if (!combinations.length) {
    return;
  }
  const payload = {
    generatedAt: new Date().toISOString(),
    articleCount: combinations.length,
    combinations,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `mnlsavior-cataleg-local-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function renderCatalog() {
  const productFilter = els.catalogProductFilter.value;
  const search = els.catalogSearch.value.trim().toLowerCase();
  const filtered = baseProducts.filter((product) => {
    if (productFilter && product.productCode !== productFilter) {
      return false;
    }
    if (!search) {
      return true;
    }
    return `${product.sku} ${product.name}`.toLowerCase().includes(search);
  });
  const groups = groupBy(filtered, (product) => `${product.productCode}-${product.coreCode}`);

  els.catalogGroups.innerHTML = "";
  if (!filtered.length) {
    els.catalogGroups.innerHTML = '<div class="empty-state">No hi ha productes amb aquest filtre.</div>';
    return;
  }

  for (const products of groups.values()) {
    const first = products[0];
    const card = document.createElement("article");
    card.className = "catalog-card";
    card.dataset.product = first.productCode;
    card.innerHTML = `
      <div class="catalog-card-head">
        <div>
          <h3>${escapeHtml(first.productName)} · ${escapeHtml(first.coreName)}</h3>
          <span>${products.length} gruixos disponibles</span>
        </div>
        <strong>${money(Math.min(...products.map((item) => item.basePrice)))}/m2+</strong>
      </div>
      <div class="price-grid">
        ${products
          .map(
            (product) => `
              <button class="price-pill" type="button" data-product="${escapeHtml(product.productCode)}" data-core="${escapeHtml(product.coreCode)}" data-thickness="${product.thicknessMm}">
                <span>${product.thicknessMm} mm</span>
                <strong>${money(product.basePrice)}</strong>
              </button>
            `,
          )
          .join("")}
      </div>
    `;
    for (const button of card.querySelectorAll(".price-pill")) {
      button.addEventListener("click", () => {
        els.form.productCode.value = button.dataset.product;
        renderCoreOptions(button.dataset.core);
        renderThicknessOptions(button.dataset.thickness);
        refreshQuote();
      });
    }
    els.catalogGroups.append(card);
  }
}

function renderCombinationPreview() {
  const productCode = els.comboProductFilter.value;
  const coreCode = els.comboCoreFilter.value;
  const sheetCode = els.comboSheetFilter.value;
  const coatingCode = els.comboCoatingFilter.value;
  const search = els.comboSearch.value.trim().toLowerCase();
  const filtered = combinations.filter((item) => {
    if (productCode && item.productCode !== productCode) return false;
    if (coreCode && item.coreCode !== coreCode) return false;
    if (sheetCode && item.sheetCode !== sheetCode) return false;
    if (coatingCode && item.coatingCode !== coatingCode) return false;
    if (!search) return true;
    return `${item.sku} ${item.name}`.toLowerCase().includes(search);
  });
  const visibleRows = filtered.slice(0, 120);
  els.combinationCount.textContent = `${filtered.length} articles`;
  els.combinationTable.innerHTML = `
    <div class="sync-row combo-head">
      <span>SKU</span>
      <span>Article</span>
      <span>Base</span>
      <span>Ajustos</span>
      <span>Preu final</span>
    </div>
    ${visibleRows
      .map(
        (item) => `
          <div class="sync-row combo-row" data-product="${escapeHtml(item.productCode)}">
            <strong>${escapeHtml(item.sku)}</strong>
            <span>${escapeHtml(item.name)}</span>
            <span>${money(item.basePrice)}</span>
            <span>${formatAdjustment(item.sheetDelta + item.coatingDelta)}</span>
            <strong>${money(item.unitPrice)}</strong>
          </div>
        `,
      )
      .join("")}
    ${
      filtered.length > visibleRows.length
        ? `<div class="empty-state">Mostrant ${visibleRows.length} de ${filtered.length}. Fes servir filtres per acotar.</div>`
        : ""
    }
  `;
}

function renderExtrasPicker() {
  els.extrasPicker.innerHTML = "";
  for (const extra of catalog.extras) {
    const row = document.createElement("label");
    row.className = "extra-row";
    row.innerHTML = `
      <span>${escapeHtml(extra.name)} <small>${money(extra.price)}/${escapeHtml(extra.unit)}</small></span>
      <input name="extra:${escapeHtml(extra.code)}" type="number" min="0" step="0.01" value="0" />
    `;
    row.querySelector("input").addEventListener("input", refreshQuote);
    els.extrasPicker.append(row);
  }
}

function renderEditors() {
  renderProductEditor();
  renderModifierEditor();
}

function renderProductEditor() {
  els.productEditor.innerHTML = "";
  for (const product of catalog.products) {
    const block = editorBlock(product.name, () => removeItem(catalog.products, product, "producte"));
    block.dataset.product = product.code;
    for (const core of product.cores) {
      const coreBlock = editorBlock(core.name, () => removeItem(product.cores, core, "nucli"), "sub-panel");
      const table = document.createElement("div");
      table.className = "mini-table";
      for (const thickness of core.thicknesses) {
        table.append(
          editablePriceRow(`${thickness.mm} mm`, thickness, "basePrice", () => {
            refreshLocalViews();
          }, () => removeItem(core.thicknesses, thickness, "article"), "€/m2", baselineThickness(product.code, core.code, thickness.mm)?.basePrice),
        );
      }
      coreBlock.append(table);
      block.append(coreBlock);
    }
    els.productEditor.append(block);
  }
}

function renderModifierEditor() {
  els.modifierEditor.innerHTML = "";
  renderSheetRulesEditor();
  renderCoatingsEditor();
  renderSimpleGroup("Extres", catalog.extras, "price", (item) => `€/${item.unit}`);
}

function renderSheetRulesEditor() {
  const block = editorBlock("Chapes", null);

  const grid = document.createElement("div");
  grid.className = "rule-grid";
  grid.append(
    readonlyRule("Base", catalog.sheetGauge.baseGauge, "mm"),
    ruleInput("Descompte cara 4", catalog.sheetGauge, "discountPerSideTo4", "€/m2", editBaseline.sheetGauge.discountPerSideTo4),
    ruleInput("Increment cara 6", catalog.sheetGauge, "increasePerSideTo6", "€/m2", editBaseline.sheetGauge.increasePerSideTo6),
  );
  block.append(grid);

  const preview = document.createElement("div");
  preview.className = "sheet-preview";
  preview.innerHTML = catalog.sheetGauge.options
    .map((sheet) => {
      const delta = calculateSheetDeltaPreview(sheet);
      return `
        <div>
          <strong>${escapeHtml(sheet.name)}</strong>
          <span>${formatSigned(delta)} €/m2</span>
        </div>
      `;
    })
    .join("");
  block.append(preview);
  els.modifierEditor.append(block);
}

function renderCoatingsEditor() {
  const block = editorBlock("Recobriments", null);
  const helper = document.createElement("p");
  helper.className = "editor-help";
  helper.textContent = "Recarrecs opcionals que se sumen al preu del panell per m2.";
  block.append(helper);

  const table = document.createElement("div");
  table.className = "mini-table";
  for (const coating of catalog.coatings) {
    table.append(
      editablePriceRow(coating.name, coating, "priceDelta", () => {
        refreshQuote();
      }, () => removeItem(catalog.coatings, coating, "recobriment"), "€/m2", editBaseline.coatings.find((item) => item.code === coating.code)?.priceDelta),
    );
  }
  block.append(table);
  els.modifierEditor.append(block);
}

function ruleInput(label, target, key, unit, baselineValue) {
  const wrapper = document.createElement("label");
  wrapper.innerHTML = `
    ${escapeHtml(label)}
    <div class="edit-control">
      <div class="unit-input">
        <input class="${valueClass(target[key], baselineValue)}" type="text" inputmode="decimal" value="${formatEditableNumber(target[key])}" />
        <span>${escapeHtml(unit)}</span>
      </div>
      <button type="button" class="reset-button" aria-label="Descartar canvi ${escapeHtml(label)}"></button>
    </div>
  `;
  const input = wrapper.querySelector("input");
  const reset = wrapper.querySelector(".reset-button");
  input.addEventListener("input", (event) => {
    const parsed = parseLocaleNumber(event.target.value);
    if (Number.isFinite(parsed)) {
      target[key] = parsed;
    }
    event.target.className = valueClass(target[key], baselineValue);
    scheduleCatalogSave();
    refreshQuote();
  });
  input.addEventListener("keydown", (event) => {
    normalizeAndFocusNext(event, target, key, baselineValue);
  });
  reset.addEventListener("click", () => {
    target[key] = baselineValue;
    renderModifierEditor();
    scheduleCatalogSave();
    refreshQuote();
  });
  return wrapper;
}

function readonlyRule(label, value, unit) {
  const wrapper = document.createElement("label");
  wrapper.innerHTML = `
    ${escapeHtml(label)}
    <div class="unit-input readonly">
      <input class="value-clean" type="text" value="${formatEditableNumber(value)}" disabled />
      <span>${escapeHtml(unit)}</span>
    </div>
  `;
  return wrapper;
}

function calculateSheetDeltaPreview(sheet) {
  return [sheet.outer, sheet.inner].reduce((total, gauge) => {
    if (Number(gauge) === 4) {
      return total - catalog.sheetGauge.discountPerSideTo4;
    }
    if (Number(gauge) === 6) {
      return total + catalog.sheetGauge.increasePerSideTo6;
    }
    return total;
  }, 0);
}

function formatSigned(value) {
  if (value > 0) {
    return `+${moneyNumber(value)}`;
  }
  return moneyNumber(value);
}

function renderSimpleGroup(title, items, priceKey, unitLabel) {
  const block = editorBlock(title, null);
  const table = document.createElement("div");
  table.className = "mini-table";
  for (const item of items) {
    table.append(
      editablePriceRow(item.name, item, priceKey, () => {
        renderExtrasPicker();
        refreshQuote();
      }, () => removeItem(items, item, title.toLowerCase()), unitLabel(item), baselineExtraValue(item, priceKey)),
    );
  }
  block.append(table);
  els.modifierEditor.append(block);
}

function editorBlock(title, onDelete, extraClass = "") {
  const block = document.createElement("div");
  block.className = `editor-card ${extraClass}`;
  const header = document.createElement("div");
  header.className = "editor-card-header";
  header.innerHTML = `<h3>${escapeHtml(title)}</h3>`;
  if (onDelete) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "trash-button";
    button.setAttribute("aria-label", `Eliminar ${title}`);
    button.addEventListener("click", onDelete);
    header.append(button);
  }
  block.append(header);
  return block;
}

function editablePriceRow(label, target, priceKey, onChange, onDelete, unitLabel, baselineValue = findBaselineValue(target, priceKey)) {
  const row = document.createElement("div");
  row.className = "mini-row price-row";
  row.innerHTML = `
    <div class="row-name">
      <strong title="${escapeHtml(label)}">${escapeHtml(label)}</strong>
      <button type="button" class="trash-button" aria-label="Eliminar ${escapeHtml(label)}"></button>
    </div>
    <div class="edit-control">
      <div class="unit-input compact"><input class="${valueClass(target[priceKey], baselineValue)}" type="text" inputmode="decimal" value="${formatEditableNumber(target[priceKey])}" aria-label="preu" /><span>${escapeHtml(unitLabel)}</span></div>
      <button type="button" class="reset-button" aria-label="Descartar canvi ${escapeHtml(label)}"></button>
    </div>
  `;
  const input = row.querySelector("input");
  const reset = row.querySelector(".reset-button");
  input.addEventListener("input", (event) => {
    const parsed = parseLocaleNumber(event.target.value);
    if (Number.isFinite(parsed)) {
      target[priceKey] = parsed;
    }
    event.target.className = valueClass(target[priceKey], baselineValue);
    scheduleCatalogSave();
    onChange();
  });
  input.addEventListener("keydown", (event) => {
    normalizeAndFocusNext(event, target, priceKey, baselineValue);
  });
  reset.addEventListener("click", () => {
    if (baselineValue === undefined) {
      return;
    }
    target[priceKey] = baselineValue;
    input.value = formatEditableNumber(baselineValue);
    input.className = valueClass(target[priceKey], baselineValue);
    scheduleCatalogSave();
    onChange();
  });
  row.querySelector("button").addEventListener("click", onDelete);
  return row;
}

function normalizeAndFocusNext(event, target, key, baselineValue) {
  if (event.key !== "Enter") {
    return;
  }
  event.preventDefault();
  const parsed = parseLocaleNumber(event.currentTarget.value);
  if (Number.isFinite(parsed)) {
    target[key] = parsed;
    event.currentTarget.value = formatEditableNumber(parsed);
    event.currentTarget.className = valueClass(target[key], baselineValue);
    scheduleCatalogSave();
  }

  const inputs = [...document.querySelectorAll('#editTab input:not([disabled]):not([hidden])')].filter(
    (input) => input.offsetParent !== null,
  );
  const index = inputs.indexOf(event.currentTarget);
  const next = inputs[index + 1] || inputs[0];
  next?.focus();
  next?.select?.();
}

function removeItem(items, item, label) {
  const name = item.name || item.code || `${item.mm} mm`;
  if (!confirm(`Segur que vols eliminar ${name}?`)) {
    return;
  }
  const index = items.indexOf(item);
  if (index !== -1) {
    items.splice(index, 1);
  }
  renderSelectorsFromUrl();
  renderCatalogFilters();
  renderExtrasPicker();
  renderEditors();
  refreshLocalViews();
}

function setupBudgeter() {
  if (!els.budgetLineForm) {
    return;
  }

  refreshBudgetCatalogOptions();

  els.budgetLineForm.productCode.addEventListener("input", () => {
    renderBudgetCoreOptions();
    renderBudgetThicknessOptions();
    renderBudgetLinePreview();
  });
  els.budgetLineForm.coreCode.addEventListener("input", () => {
    renderBudgetThicknessOptions();
    renderBudgetLinePreview();
  });
  els.budgetLineForm.addEventListener("input", renderBudgetLinePreview);
  els.addBudgetLine.addEventListener("click", addBudgetLine);
  els.newBudget.addEventListener("click", () => {
    budgetLines = [];
    els.holdedQuoteSearch.value = "";
    els.budgetStatus.textContent = "Esborrany local";
    renderBudgetRows();
  });
  els.loadHoldedQuote.addEventListener("click", () => {
    const reference = els.holdedQuoteSearch.value.trim();
    els.budgetStatus.textContent = reference
      ? `Carrega Holded pendent: ${reference}`
      : "Indica un numero o ID";
  });

  renderBudgetLinePreview();
  renderBudgetRows();
}

function refreshBudgetCatalogOptions() {
  if (!els.budgetLineForm) {
    return;
  }
  setOptions(els.budgetLineForm.productCode, catalog.products, "code", "name", els.budgetLineForm.productCode.value);
  renderBudgetCoreOptions();
  renderBudgetThicknessOptions();
  setOptions(els.budgetLineForm.sheetCode, catalog.sheetGauge.options, "code", "name", els.budgetLineForm.sheetCode.value);
  setOptions(els.budgetLineForm.coatingCode, catalog.coatings, "code", "name", els.budgetLineForm.coatingCode.value);
  renderBudgetLinePreview();
}

function renderBudgetCoreOptions() {
  const product = catalog.products.find((item) => item.code === els.budgetLineForm.productCode.value) || catalog.products[0];
  setOptions(els.budgetLineForm.coreCode, product?.cores || [], "code", "name");
}

function renderBudgetThicknessOptions() {
  const product = catalog.products.find((item) => item.code === els.budgetLineForm.productCode.value) || catalog.products[0];
  const core = product?.cores.find((item) => item.code === els.budgetLineForm.coreCode.value) || product?.cores[0];
  els.budgetLineForm.thicknessMm.innerHTML = "";
  for (const thickness of core?.thicknesses || []) {
    const option = document.createElement("option");
    option.value = thickness.mm;
    option.textContent = `${thickness.mm} mm`;
    els.budgetLineForm.thicknessMm.append(option);
  }
}

function budgetFormToQuoteInput() {
  const data = Object.fromEntries(new FormData(els.budgetLineForm));
  data.extras = {};
  return data;
}

function renderBudgetLinePreview() {
  try {
    const line = calculateQuoteLineLocal(budgetFormToQuoteInput());
    els.budgetLinePrice.textContent = `${money(line.subtotal)} · ${money(line.unitPrice)}/m2`;
  } catch (error) {
    els.budgetLinePrice.textContent = error.message;
  }
}

function addBudgetLine() {
  try {
    const input = budgetFormToQuoteInput();
    const line = calculateQuoteLineLocal(input);
    budgetLines.push({
      id: crypto.randomUUID(),
      ...line,
      productCode: input.productCode,
      coreCode: input.coreCode,
      thicknessMm: Number(input.thicknessMm),
      sheetCode: input.sheetCode,
      coatingCode: input.coatingCode,
    });
    els.budgetStatus.textContent = `${budgetLines.length} linies`;
    renderBudgetRows();
  } catch (error) {
    els.budgetStatus.textContent = error.message;
  }
}

function renderBudgetRows() {
  if (!budgetLines.length) {
    els.budgetRows.innerHTML = '<div class="empty-state">Encara no hi ha linies al pressupost.</div>';
    els.budgetTotal.textContent = money(0);
    return;
  }

  els.budgetRows.innerHTML = budgetLines
    .map(
      (line) => `
        <div class="budget-row" data-product="${escapeHtml(line.productCode)}">
          <div>
            <strong>${escapeHtml(line.name)}</strong>
            <span>${escapeHtml(line.description)} · ${escapeHtml(line.sku)}</span>
          </div>
          <span>${moneyNumber(line.quantity)} m2</span>
          <span>${money(line.unitPrice)}/m2</span>
          <strong>${money(line.subtotal)}</strong>
          <button class="trash-button" type="button" data-remove-budget-line="${escapeHtml(line.id)}" aria-label="Eliminar linia"></button>
        </div>
      `,
    )
    .join("");

  for (const button of els.budgetRows.querySelectorAll("[data-remove-budget-line]")) {
    button.addEventListener("click", () => {
      budgetLines = budgetLines.filter((line) => line.id !== button.dataset.removeBudgetLine);
      els.budgetStatus.textContent = budgetLines.length ? `${budgetLines.length} linies` : "Esborrany local";
      renderBudgetRows();
    });
  }

  const total = budgetLines.reduce((sum, line) => sum + line.subtotal, 0);
  els.budgetTotal.textContent = money(total);
}

function setupCreateFlow() {
  const form = els.createForm;
  form.kind.addEventListener("input", renderCreateFlow);
  form.productCode.addEventListener("input", renderCreateCoreOptions);
  form.name.addEventListener("input", inferCreateFieldsFromName);
  renderCreateProductOptions();
  renderCreateCoreOptions();
  renderCreateFlow();
}

function openCreateDialog() {
  els.createForm.reset();
  renderCreateProductOptions();
  renderCreateCoreOptions();
  renderCreateFlow();
  els.createDialog.showModal();
}

function renderCreateProductOptions() {
  setOptions(els.createForm.productCode, catalog.products, "code", "name");
}

function renderCreateCoreOptions() {
  const product = catalog.products.find((item) => item.code === els.createForm.productCode.value) || catalog.products[0];
  setOptions(els.createForm.coreCode, product?.cores || [], "code", "name");
}

function renderCreateFlow() {
  const kind = els.createForm.kind.value;
  for (const field of els.createForm.querySelectorAll("[data-create-field]")) {
    const key = field.dataset.createField;
    const visible =
      (kind === "product" && ["code"].includes(key)) ||
      (kind === "core" && ["product", "code", "coreName"].includes(key)) ||
      (kind === "thickness" && ["product", "core", "thickness", "price"].includes(key));
    field.hidden = !visible;
  }
}

function inferCreateFieldsFromName() {
  const form = els.createForm;
  const text = form.name.value.toUpperCase();
  const product = catalog.products.find((item) => text.includes(item.code));
  if (product) {
    form.productCode.value = product.code;
    renderCreateCoreOptions();
  }

  const selected = catalog.products.find((item) => item.code === form.productCode.value) || catalog.products[0];
  const core = selected?.cores.find((item) => text.includes(item.code) || text.includes(item.name.toUpperCase()));
  if (core) {
    form.coreCode.value = core.code;
  }

  const thickness = text.match(/(\d+)\s*MM/);
  if (thickness) {
    form.thicknessMm.value = thickness[1];
  }
}

function createItemFromDialog() {
  const form = els.createForm;
  const kind = form.kind.value;
  if (!form.name.value.trim()) {
    alert("Indica el nom de l'element.");
    return;
  }

  if (kind === "product") {
    const code = normalizeCode(form.code.value || form.name.value);
    if (!code) {
      alert("Indica un codi valid.");
      return;
    }
    if (!ensureUnique(catalog.products, code, "familia")) {
      return;
    }
    catalog.products.push({ code, name: form.name.value.trim(), cores: [] });
  }

  if (kind === "core") {
    const product = findProduct(form.productCode.value);
    const code = normalizeCode(form.code.value || form.coreName.value || form.name.value);
    if (!code) {
      alert("Indica un codi valid per al tipus / nucli.");
      return;
    }
    if (!ensureUnique(product.cores, code, "tipus")) {
      return;
    }
    product.cores.push({ code, name: (form.coreName.value || form.name.value).trim(), thicknesses: [] });
  }

  if (kind === "thickness") {
    const product = findProduct(form.productCode.value);
    const core = product.cores.find((item) => item.code === form.coreCode.value);
    if (!core) {
      alert("Selecciona un tipus / nucli valid.");
      return;
    }
    const mm = Number(form.thicknessMm.value);
    const basePrice = Number(form.basePrice.value);
    if (!Number.isFinite(mm) || mm <= 0 || !Number.isFinite(basePrice) || basePrice < 0) {
      alert("Indica gruix i preu base correctes.");
      return;
    }
    if (core.thicknesses.some((item) => Number(item.mm) === mm)) {
      alert(`Ja existeix ${product.name} ${core.name} ${mm} mm.`);
      return;
    }
    core.thicknesses.push({ mm, basePrice });
    core.thicknesses.sort((a, b) => a.mm - b.mm);
  }

  els.createDialog.close();
  renderSelectorsFromUrl();
  renderCatalogFilters();
  renderExtrasPicker();
  renderEditors();
  refreshLocalViews();
}

function findProduct(code) {
  const product = catalog.products.find((item) => item.code === code);
  if (!product) {
    throw new Error(`Familia no trobada: ${code}`);
  }
  return product;
}

function baselineThickness(productCode, coreCode, mm) {
  return editBaseline.products
    .find((product) => product.code === productCode)
    ?.cores.find((core) => core.code === coreCode)
    ?.thicknesses.find((thickness) => Number(thickness.mm) === Number(mm));
}

function baselineExtraValue(item, key) {
  return editBaseline.extras.find((extra) => extra.code === item.code)?.[key];
}

function ensureUnique(items, code, label) {
  if (items.some((item) => item.code === code)) {
    alert(`Ja existeix aquest codi de ${label}: ${code}`);
    return false;
  }
  return true;
}

function normalizeCode(value) {
  return value
    .trim()
    .toUpperCase()
    .replace(/^PANELL\s+/, "")
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9-]/g, "");
}

function refreshLocalViews() {
  baseProducts = buildBaseProductsFromCatalog();
  els.baseCount.textContent = `${baseProducts.length} bases`;
  renderCatalog();
  refreshBudgetCatalogOptions();
  scheduleCatalogSave();
  refreshQuote();
}

function scheduleCatalogSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    if (apiAvailable) {
      await fetch("/api/catalog", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(catalog),
      });
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(catalog));
    els.status.textContent = "Canvi guardat";
  }, 500);
}

async function refreshQuote() {
  try {
    const body = formToQuoteInput();
    lastLine = apiAvailable ? await postJson("/api/quote/preview", body) : calculateQuoteLineLocal(body);
    els.unitPrice.textContent = `${money(lastLine.unitPrice)}/m2`;
    els.panelSubtotal.textContent = money(lastLine.panelSubtotal);
    els.extrasSubtotal.textContent = money(lastLine.extrasSubtotal);
    els.subtotal.textContent = money(lastLine.subtotal);
    els.quotePreview.textContent = JSON.stringify({ request: body, response: lastLine }, null, 2);
    els.status.textContent = "Preview llest";
    updateUrl(body);
  } catch (error) {
    els.status.textContent = error.message;
  }
}

function formToQuoteInput() {
  const data = Object.fromEntries(new FormData(els.form));
  data.extras = {};
  for (const input of els.extrasPicker.querySelectorAll("input")) {
    const code = input.name.replace("extra:", "");
    data.extras[code] = Number(input.value || 0);
  }
  return data;
}

async function refreshSyncPreview() {
  if (syncMode === "combinations") {
    await refreshCombinations();
    return;
  }
  if (!apiAvailable) {
    els.syncTable.innerHTML =
      '<div class="empty-state">La comparacio amb Holded necessita el servidor local. A GitHub Pages pots veure i editar el cataleg, pero no connectar amb Holded.</div>';
    return;
  }
  els.syncTable.innerHTML = '<div class="empty-state">Comparant amb Holded...</div>';
  try {
    const preview = await getJson("/api/holded/sync-preview");
    els.syncVersion.textContent = preview.version;
    els.syncCreate.textContent = preview.counts.create || 0;
    els.syncUpdate.textContent = preview.counts.update || 0;
    els.syncUnchanged.textContent = preview.counts.unchanged || 0;
    els.syncHoldedOnly.textContent = preview.counts["holded-only"] || 0;
    renderSyncRows(preview.rows);
  } catch (error) {
    els.syncTable.innerHTML = `<div class="empty-state error">${escapeHtml(error.message)}</div>`;
  }
}

async function setSyncMode(mode) {
  syncMode = mode;
  for (const segment of els.syncSegments) {
    segment.classList.toggle("active", segment.dataset.syncMode === mode);
  }
  els.baseSyncSummary.hidden = mode !== "base";
  els.syncTable.hidden = mode !== "base";
  els.combinationPreview.hidden = mode !== "combinations";
  els.refreshSync.textContent = mode === "base" ? "Comparar amb Holded" : "Generar preview";
  if (mode === "combinations" && !combinations.length) {
    await refreshCombinations();
  }
}

function renderSyncRows(rows) {
  const actionLabels = {
    create: "Crear",
    update: "Modificar",
    unchanged: "Sense canvis",
    "holded-only": "Nomes Holded",
  };
  els.syncTable.innerHTML = `
    <div class="sync-row sync-head">
      <span>Accio</span>
      <span>SKU</span>
      <span>Preu local</span>
      <span>Preu Holded</span>
      <span>Diferencies</span>
    </div>
    ${rows
      .map(
        (row) => `
          <div class="sync-row ${row.action}">
            <span><mark>${actionLabels[row.action] || row.action}</mark></span>
            <strong>${escapeHtml(row.sku || "-")}</strong>
            <span>${row.localPrice === null ? "-" : money(row.localPrice)}</span>
            <span>${row.holdedPrice === null ? "-" : money(row.holdedPrice)}</span>
            <span>${escapeHtml(row.diffs.join(", ") || "-")}</span>
          </div>
        `,
      )
      .join("")}
  `;
}

function setDeveloperMode(enabled) {
  document.body.classList.toggle("dev-mode", enabled);
}

function updateUrl(body) {
  const params = new URLSearchParams({
    productCode: body.productCode,
    coreCode: body.coreCode,
    thicknessMm: body.thicknessMm,
    sheetCode: body.sheetCode,
    coatingCode: body.coatingCode,
    quantity: body.quantity,
  });
  window.history.replaceState(null, "", `?${params.toString()}`);
}

function selectedProduct() {
  return catalog.products.find((item) => item.code === els.form.productCode.value) || catalog.products[0];
}

function selectedCore() {
  const product = selectedProduct();
  return product.cores.find((item) => item.code === els.form.coreCode.value) || product.cores[0];
}

function setOptions(select, items, valueKey, labelKey, selectedValue) {
  select.innerHTML = "";
  for (const item of items) {
    const option = document.createElement("option");
    option.value = item[valueKey];
    option.textContent = item[labelKey];
    select.append(option);
  }
  if (selectedValue && [...select.options].some((option) => option.value === selectedValue)) {
    select.value = selectedValue;
  }
}

function buildBaseProductsFromCatalog() {
  return catalog.products.flatMap((product) =>
    product.cores.flatMap((core) =>
      core.thicknesses.map((thickness) => ({
        sku: `${product.code}-${String(thickness.mm).padStart(3, "0")}-${core.code}`,
        name: `${product.name} ${thickness.mm} ${core.name}`,
        productCode: product.code,
        productName: product.name,
        coreCode: core.code,
        coreName: core.name,
        thicknessMm: thickness.mm,
        basePrice: thickness.basePrice,
        unit: catalog.unit,
      })),
    ),
  );
}

function buildCombinationsFromCatalog() {
  return catalog.products.flatMap((product) =>
    product.cores.flatMap((core) =>
      core.thicknesses.flatMap((thickness) =>
        catalog.sheetGauge.options.flatMap((sheet) =>
          catalog.coatings.map((coating) => {
            const sheetDelta = calculateSheetDeltaForSheet(sheet);
            const coatingDelta = Number(coating.priceDelta || 0);
            const unitPrice = roundMoney(Number(thickness.basePrice) + sheetDelta + coatingDelta);
            return {
              sku: `${product.code}-${String(thickness.mm).padStart(3, "0")}-${core.code}-${sheet.code}-${coating.code}`,
              name: `${product.name} ${thickness.mm} ${core.name} · Chapa ${sheet.name} · ${coating.name}`,
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
          }),
        ),
      ),
    ),
  );
}

function calculateQuoteLineLocal(input) {
  const product = catalog.products.find((item) => item.code === input.productCode);
  const core = product?.cores.find((item) => item.code === input.coreCode);
  const thickness = core?.thicknesses.find((item) => Number(item.mm) === Number(input.thicknessMm));
  const sheet = catalog.sheetGauge.options.find((item) => item.code === input.sheetCode);
  const coating = catalog.coatings.find((item) => item.code === input.coatingCode) || catalog.coatings[0];
  const quantity = Number(input.quantity || 1);
  if (!product || !core || !thickness || !sheet || !Number.isFinite(quantity)) {
    throw new Error("Configuracio invalida.");
  }
  const sheetDelta = calculateSheetDeltaForSheet(sheet);
  const coatingDelta = Number(coating.priceDelta || 0);
  const unitPrice = roundMoney(Number(thickness.basePrice) + sheetDelta + coatingDelta);
  const extras = Object.entries(input.extras || {})
    .map(([code, value]) => {
      const extra = catalog.extras.find((item) => item.code === code);
      const extraQuantity = Number(value || 0);
      return extra && extraQuantity > 0
        ? {
            code,
            name: extra.name,
            unit: extra.unit,
            unitPrice: extra.price,
            quantity: extraQuantity,
            subtotal: roundMoney(extra.price * extraQuantity),
          }
        : null;
    })
    .filter(Boolean);
  const extrasSubtotal = roundMoney(extras.reduce((total, extra) => total + extra.subtotal, 0));
  const panelSubtotal = roundMoney(unitPrice * quantity);
  return {
    sku: `${product.code}-${String(thickness.mm).padStart(3, "0")}-${core.code}-${sheet.code}-${coating.code}`,
    name: `${product.name} ${thickness.mm} ${core.name}`,
    description: `Chapa ${sheet.name} · ${coating.name}`,
    quantity,
    unitPrice,
    panelSubtotal,
    extras,
    extrasSubtotal,
    subtotal: roundMoney(panelSubtotal + extrasSubtotal),
  };
}

function calculateSheetDeltaForSheet(sheet) {
  return [sheet.outer, sheet.inner].reduce((total, gauge) => {
    if (Number(gauge) === 4) return total - Number(catalog.sheetGauge.discountPerSideTo4 || 0);
    if (Number(gauge) === 6) return total + Number(catalog.sheetGauge.increasePerSideTo6 || 0);
    return total;
  }, 0);
}

function roundMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

async function loadCatalog() {
  const forceStatic = new URLSearchParams(window.location.search).has("static");
  if (!forceStatic) {
    try {
      const apiCatalog = await getJson("/api/catalog");
      apiAvailable = true;
      return apiCatalog;
    } catch {
      apiAvailable = false;
    }
  } else {
    apiAvailable = false;
  }

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  const candidates = ["../data/catalog.json", "data/catalog.json", "/data/catalog.json"];
  for (const path of candidates) {
    try {
      const response = await fetch(path);
      if (response.ok) {
        return response.json();
      }
    } catch {
      // Try next static path.
    }
  }
  throw new Error("No s'ha pogut carregar data/catalog.json.");
}

function groupBy(items, keyFn) {
  const groups = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(item);
  }
  return groups;
}

async function getJson(url) {
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Error");
  }
  return payload;
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Error");
  }
  return payload;
}

function money(value) {
  return new Intl.NumberFormat("ca-ES", {
    style: "currency",
    currency: catalog.currency,
  }).format(Number(value || 0));
}

function moneyNumber(value) {
  return new Intl.NumberFormat("ca-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatAdjustment(value) {
  const rounded = Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  const formatted = money(rounded);
  return rounded > 0 ? `+${formatted}` : formatted;
}

function parseLocaleNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return NaN;
  }
  return Number(String(value).trim().replace(",", "."));
}

function formatEditableNumber(value) {
  if (value === "" || value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "";
  }
  return String(Number(value)).replace(".", ",");
}

function valueClass(current, baseline) {
  if (baseline === undefined) {
    return "value-dirty";
  }
  return Number(current) === Number(baseline) ? "value-clean" : "value-dirty";
}

function findBaselineValue(target, key) {
  const match = findBaselineObject(editBaseline, target);
  return match ? match[key] : undefined;
}

function findBaselineObject(root, target) {
  if (!root || !target || typeof root !== "object") {
    return null;
  }
  if (target.code && root.code === target.code) {
    return root;
  }
  if (target.mm !== undefined && root.mm !== undefined && Number(root.mm) === Number(target.mm)) {
    return root;
  }
  for (const value of Object.values(root)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = findBaselineObject(item, target);
        if (found) {
          return found;
        }
      }
    } else if (value && typeof value === "object") {
      const found = findBaselineObject(value, target);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
