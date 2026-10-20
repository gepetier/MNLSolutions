internal_token = env['ir.config_parameter'].sudo().get_param('mnl.sales_flow_internal_token')
# Retain dimensions and exact accepted reference using Odoo's native sale_line_ids.
if not internal_token or env.context.get('mnl_flow_internal') != internal_token:
    for line in records:
        if line.x_mnl_source_line_id and not line.sale_line_ids:
            raise UserError('No es pot eliminar el vincle de la línia amb la comanda acceptada.')
        if line.display_type != 'product' or line.move_id.move_type != 'out_invoice' or not line.sale_line_ids:
            continue
        if len(line.sale_line_ids) != 1:
            raise UserError('Cada línia de factura MNL ha de tenir una única línia de comanda d’origen.')
        source = line.sale_line_ids
        order = source.order_id
        if not order.x_mnl_frozen or not order.x_mnl_accepted_document_id:
            raise UserError('Cal una comanda acceptada i congelada abans de crear la factura.')
        if not order.partner_invoice_id.commercial_partner_id.vat:
            raise UserError('Completa el NIF/CIF del client abans de crear la factura.')
        if line.product_id != source.product_id or line.product_uom_id != source.product_uom_id:
            raise UserError('El producte i la unitat han de coincidir amb la versió acceptada.')
        if abs(line.quantity - source.x_mnl_accepted_qty) > 0.00001 or abs(line.price_unit - source.x_mnl_accepted_price) > 0.00001:
            raise UserError('Aquest primer flux factura la línia acceptada completa, amb la quantitat i el preu acordats.')
        if abs(line.discount - source.discount) > 0.00001 or set(line.tax_ids.ids) != set(source.tax_ids.ids):
            raise UserError('Els impostos i descomptes han de coincidir amb la versió acceptada.')
        duplicate = env['account.move.line'].search([('id', '!=', line.id), ('sale_line_ids', 'in', source.ids),
            ('move_id.move_type', '=', 'out_invoice'), ('move_id.state', '!=', 'cancel'), ('display_type', '=', 'product')], limit=1)
        if duplicate:
            raise UserError('Aquesta línia acceptada ja està inclosa en una factura activa; evita duplicar-la.')
        values = {'x_mnl_source_line_id': source.id, 'x_mnl_source_ref': order.x_mnl_accepted_ref,
                  'x_mnl_source_revision': order.x_mnl_accepted_revision,
                  'x_mnl_article': source.x_mnl_accepted_article, 'x_mnl_class': source.x_mnl_accepted_class,
                  'x_mnl_units': source.x_mnl_accepted_units, 'x_mnl_length': source.x_mnl_accepted_length,
                  'x_mnl_width': source.x_mnl_accepted_width, 'x_mnl_kind': source.x_mnl_accepted_kind}
        previous = (env.context.get('old_values') or {}).get(line.id, {})
        for field_name in values:
            if field_name in previous and previous[field_name] and line[field_name] != values[field_name]:
                raise UserError('La traçabilitat i les dimensions copiades de la versió acceptada són de només lectura.')
        line.with_context(mnl_flow_internal=internal_token).write(values)
action = {'type': 'ir.actions.act_window_close'}
