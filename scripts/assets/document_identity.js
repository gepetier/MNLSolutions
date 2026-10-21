/* Presentation only. Document numbers and business fields are never changed here. */
(() => {
  if(window.__mnlDocumentIdentityLoaded)return;window.__mnlDocumentIdentityLoaded=true;
  const style=document.createElement('style');
  style.textContent=`
    .mnl_doc_quote { --mnl-doc-strong:#183c4f; --mnl-doc-soft:#e9f0f3; --mnl-doc-border:#b9ccd5; }
    .mnl_doc_order { --mnl-doc-strong:#236044; --mnl-doc-soft:#eaf4ed; --mnl-doc-border:#b5d3bd; }
    .mnl_doc_purchase { --mnl-doc-strong:#89500e; --mnl-doc-soft:#fff2df; --mnl-doc-border:#e1c293; }
    .mnl_doc_invoice { --mnl-doc-strong:#593779; --mnl-doc-soft:#f0eaf6; --mnl-doc-border:#d3c3e2; }
    .mnl_document_identity { margin:0 0 14px; padding:10px 14px; border-left:6px solid var(--mnl-doc-strong); border-radius:4px; background:var(--mnl-doc-soft); color:var(--mnl-doc-strong); font-weight:700; font-size:13px; letter-spacing:.8px; }
    [data-mnl-document] .oe_title { border-bottom:2px solid var(--mnl-doc-border); padding-bottom:10px; margin-bottom:15px; }
    [data-mnl-document] .o_notebook .nav-link.active { border-top:3px solid var(--mnl-doc-strong); color:var(--mnl-doc-strong); background:var(--mnl-doc-soft); }
    [data-mnl-document] .o_field_widget:is([name="order_line"],[name="invoice_line_ids"]) thead th { background:var(--mnl-doc-strong) !important; color:white !important; }
    [data-mnl-document] .o_field_widget:is([name="order_line"],[name="invoice_line_ids"]) thead th * { color:white !important; }
    [data-mnl-document] .o_is_line_section td,[data-mnl-document] .o_is_line_subsection td { background:var(--mnl-doc-soft) !important; color:var(--mnl-doc-strong) !important; }
    [data-mnl-document] .mnl_invoice_notice { border-left-color:var(--mnl-doc-strong); background:var(--mnl-doc-soft); color:var(--mnl-doc-strong); }
  `;document.head.append(style);
  const kinds=['quote','order','purchase','invoice'];
  function update(){
    document.querySelectorAll('.o_form_view').forEach(view=>{
      const marker=[...view.querySelectorAll('.mnl_document_identity')].find(x=>x.getClientRects().length);
      const kind=marker?.dataset.mnlKind;
      for(const k of kinds)view.classList.toggle('mnl_doc_'+k,k===kind);
      if(kind)view.dataset.mnlDocument=kind;else delete view.dataset.mnlDocument;
    });
  }
  let scheduled=false;new MutationObserver(()=>{if(!scheduled){scheduled=true;requestAnimationFrame(()=>{scheduled=false;update();});}}).observe(document.documentElement,{childList:true,subtree:true});update();
})();
