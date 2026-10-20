/* Presentation only: never changes the sale order or its fields. */
(() => {
  if (window.__mnlQuotationLayoutLoaded) return;
  window.__mnlQuotationLayoutLoaded = true;
  const key = 'mnl.quotation.hideLateralSpace.v1';
  let expanded = true;
  try { expanded = localStorage.getItem(key) !== 'false'; } catch { /* Storage may be disabled. */ }
  const style = document.createElement('style');
  style.textContent = `
    .o_sale_order .mnl_quote_layout_controls { display:flex; justify-content:flex-end; margin:-36px 0 20px; }
    .o_sale_order .mnl_customer_card { padding:18px 20px; background:var(--o-view-background-color, #fff); border:1px solid #dedee5; border-radius:10px; width:100%; min-width:0; }
    .o_sale_order .mnl_customer_selection { display:grid; grid-template-columns:140px minmax(0,1fr); gap:10px 16px; align-items:baseline; padding-bottom:12px; margin-bottom:12px; border-bottom:1px solid #e8e8ed; }
    .o_sale_order .mnl_customer_grid { display:grid; grid-template-columns:140px minmax(0,1fr); gap:8px 16px; align-items:baseline; }
    .o_sale_order .mnl_customer_card label { margin:0; color:#626977; font-weight:500; white-space:normal; }
    .o_sale_order .mnl_customer_card .o_field_widget { min-width:0; margin-bottom:0; width:100%; }
    .o_sale_order .mnl_customer_card .o_field_char { overflow-wrap:anywhere; }
    .o_sale_order .mnl_customer_card .o_readonly_modifier.o_field_empty::after { content:'—'; color:#979ba4; }
    .o_sale_order .mnl_customer_card .o_readonly_modifier.o_field_empty > * { display:none !important; }
    .o_sale_order.mnl_quote_wide .o_form_renderer { flex:1 1 100% !important; width:100% !important; max-width:none !important; }
    .o_sale_order.mnl_quote_wide .o_form_sheet_bg { flex:1 1 auto !important; width:100% !important; max-width:none !important; }
    .o_sale_order.mnl_quote_wide .o_form_sheet { width:auto !important; max-width:none !important; }
    @media(max-width:767px) {
      .o_sale_order .mnl_quote_layout_controls { margin:0 0 12px; }
      .o_sale_order .mnl_customer_card { padding:12px; }
      .o_sale_order .mnl_customer_selection,.o_sale_order .mnl_customer_grid { grid-template-columns:110px minmax(0,1fr); gap:8px; }
    }
  `;
  document.head.append(style);
  function update() {
    document.querySelectorAll('.o_sale_order').forEach(view => {
      const host = view.querySelector('.mnl_quote_layout_controls');
      if (!host) return;
      if (view.classList.contains('mnl_quote_wide') !== expanded) view.classList.toggle('mnl_quote_wide', expanded);
      let button = host.querySelector('button');
      if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-outline-secondary btn-sm';
        button.addEventListener('click', () => {
          expanded = !expanded;
          try { localStorage.setItem(key, String(expanded)); } catch { /* Retain preference for this page. */ }
          update();
        });
        host.append(button);
      }
      const label = expanded ? 'Mostrar espai lateral' : 'Amagar espai lateral';
      if (button.textContent !== label) button.textContent = label;
      button.setAttribute('aria-pressed', String(expanded));
      button.title = 'Alternar entre amplada completa i amplada estàndard. Es recorda en aquest navegador.';
    });
  }
  let scheduled = false;
  new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; update(); });
  }).observe(document.documentElement, { childList:true, subtree:true });
  update();
})();
