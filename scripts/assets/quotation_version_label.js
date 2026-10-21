odoo.define('mnl.quotation_version_label', ['@web/core/utils/patch', '@web/views/form/form_controller'], function (require) {
  'use strict';
  const { patch } = require('@web/core/utils/patch');
  const { FormController } = require('@web/views/form/form_controller');
  patch(FormController.prototype, {
    getStaticActionMenuItems() {
      const items = super.getStaticActionMenuItems(...arguments);
      const record = this.model.root;
      if (record.resModel === 'sale.order' && ['draft', 'sent'].includes(record.data.state) && items.duplicate) {
        items.duplicate = { ...items.duplicate, description: 'Nova versió' };
      }
      return items;
    },
  });
});
