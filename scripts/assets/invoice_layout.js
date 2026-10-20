odoo.define('mnl.invoice_layout', [
  '@web/core/registry',
  '@account/components/product_label_section_and_note_field/product_label_section_and_note_field_o2m',
  '@account/components/section_and_note_fields_backend/section_and_note_fields_backend',
], function (require) {
  'use strict';
  const { registry } = require('@web/core/registry');
  const { SectionAndNoteListRenderer } = require('@account/components/section_and_note_fields_backend/section_and_note_fields_backend');
  const native = registry.category('fields').get('product_label_section_and_note_field_o2m');
  const NativeRenderer = native.component.components.ListRenderer;
  class InvoiceRenderer extends NativeRenderer {
    get isMnl() { return Boolean(this.props.list.evalContext.parent.x_mnl_source_order_ids?.length); }
    setup() { super.setup(); if (this.isMnl) this.titleField = 'x_mnl_article'; }
    getColumns(record) {
      this.titleField = this.isMnl ? 'x_mnl_article' : 'name';
      return this.isMnl ? SectionAndNoteListRenderer.prototype.getColumns.call(this, record) : super.getColumns(record);
    }
    getSectionColumns(columns, record) {
      return this.isMnl ? SectionAndNoteListRenderer.prototype.getSectionColumns.call(this, columns, record) : super.getSectionColumns(columns, record);
    }
    canUseFormatter(column, record) {
      if (this.isMnl && (column.name === 'x_mnl_article' || ['x_mnl_length', 'x_mnl_width'].includes(column.name))) return true;
      return super.canUseFormatter(column, record);
    }
    getFormattedValue(column, record) {
      if (this.isMnl && column.name === 'x_mnl_article') {
        if (this.isSectionOrNote(record)) {
          const index = this.props.list.records.indexOf(record);
          let source = '';
          for (const next of this.props.list.records.slice(index + 1)) {
            if (this.isSection(next)) break;
            if (next.data.x_mnl_source_ref) { source = next.data.x_mnl_source_ref; break; }
          }
          return (record.data.name || '') + (source && this.isSection(record) ? ' · ' + source : '');
        }
        return record.data.x_mnl_article || '';
      }
      if (this.isMnl && ['x_mnl_length', 'x_mnl_width'].includes(column.name)) {
        const kind = record.data.x_mnl_kind;
        if ((column.name === 'x_mnl_width' && kind !== 'm2') || (column.name === 'x_mnl_length' && !['m2', 'ml'].includes(kind))) return '—';
      }
      return super.getFormattedValue(column, record);
    }
  }
  class InvoiceLines extends native.component {
    static components = { ...native.component.components, ListRenderer: InvoiceRenderer };
  }
  registry.category('fields').add('mnl_invoice_lines', { ...native, component: InvoiceLines });

  const style = document.createElement('style');
  style.textContent = `
    .mnl_invoice_form .mnl_invoice_controls { display:flex; justify-content:flex-end; margin:0 0 12px; }
    .mnl_invoice_form.mnl_invoice_wide .o-mail-ChatterContainer { display:none !important; }
    .mnl_invoice_form.mnl_invoice_wide .o_form_renderer,.mnl_invoice_form.mnl_invoice_wide .o_form_sheet_bg { flex:1 1 auto !important; max-width:none !important; width:100% !important; }
    .mnl_invoice_form.mnl_invoice_wide .o_form_sheet { max-width:none !important; width:auto !important; }
    .mnl_invoice_form.mnl_invoice_active .o_field_widget[name="invoice_line_ids"] table { table-layout:auto !important; }
    .mnl_invoice_form.mnl_invoice_active td[name="x_mnl_article"] { min-width:280px; width:36%; white-space:normal !important; overflow-wrap:anywhere; }
    .mnl_invoice_form.mnl_invoice_active td[name="x_mnl_article"] > * { white-space:normal !important; }
    .mnl_invoice_form.mnl_invoice_active th { white-space:nowrap; }
    .mnl_invoice_form.mnl_invoice_active td { padding:10px 9px !important; vertical-align:middle; }
    .mnl_invoice_form.mnl_invoice_active .o_is_line_section td,.mnl_invoice_form.mnl_invoice_active .o_is_line_subsection td { background:rgba(90,140,170,.12); font-weight:600; padding-top:13px !important; padding-bottom:13px !important; }
    .mnl_invoice_form .mnl_invoice_notice { padding:10px 14px; border-left:3px solid #789aaa; background:rgba(90,140,170,.08); margin-bottom:14px; }
    @media(max-width:1000px) { .mnl_invoice_form.mnl_invoice_active td[name="x_mnl_article"] { min-width:200px; } }
  `;
  document.head.append(style);
  const storageKey = 'mnl.invoice.hideChatter.v1';
  let wide = true;
  try { wide = localStorage.getItem(storageKey) !== 'false'; } catch { /* Page preference only. */ }
  function update() {
    document.querySelectorAll('.mnl_invoice_form').forEach(view => {
      const host = view.querySelector('.mnl_invoice_controls');
      const active = Boolean(host && host.getClientRects().length);
      view.classList.toggle('mnl_invoice_active', active);
      view.classList.toggle('mnl_invoice_wide', active && wide);
      if (!active) return;
      let button = host.querySelector('button');
      if (!button) {
        button = document.createElement('button'); button.type = 'button'; button.className = 'btn btn-outline-secondary btn-sm';
        button.addEventListener('click', () => { wide = !wide; try { localStorage.setItem(storageKey, String(wide)); } catch { /* Page preference only. */ } update(); });
        host.append(button);
      }
      const label = wide ? 'Mostrar activitat lateral' : 'Amagar activitat lateral';
      if (button.textContent !== label) button.textContent = label;
      button.setAttribute('aria-pressed', String(!wide));
    });
  }
  let scheduled = false;
  new MutationObserver(() => { if (!scheduled) { scheduled = true; requestAnimationFrame(() => { scheduled = false; update(); }); } }).observe(document.documentElement, { childList:true, subtree:true });
  update();
});
