internal_token = env['ir.config_parameter'].sudo().get_param('mnl.sales_flow_internal_token')
# Odoo safe_eval: freeze a confirmed sale and retain its accepted commercial data.
protected = ['name', 'partner_id', 'partner_invoice_id', 'partner_shipping_id', 'payment_term_id',
             'currency_id', 'pricelist_id', 'fiscal_position_id', 'date_order', 'validity_date',
             'note', 'state', 'locked', 'signature', 'signed_by', 'signed_on']
for order in records:
    if internal_token and env.context.get('mnl_flow_internal') == internal_token:
        continue
    previous = (env.context.get('old_values') or {}).get(order.id, {})
    was_frozen = previous.get('x_mnl_frozen', order.x_mnl_frozen)
    if was_frozen:
        for field_name in previous:
            if field_name in protected or field_name.startswith('x_'):
                if order[field_name] != previous[field_name]:
                    raise UserError('La versió acceptada està congelada. Crea un pressupost nou per modificar les condicions comercials.')
        continue
    if order.state != 'sale':
        if order.date_order and order.x_mnl_issued_at != order.date_order:
            order.with_context(mnl_flow_internal=internal_token).write({'x_mnl_issued_at': order.date_order})
        continue
    errors = []
    product_lines = order.order_line.filtered(lambda row: not row.display_type and row.product_id)
    if not product_lines:
        errors.append('El pressupost no té articles.')
    for line in product_lines:
        kind = line.product_id.product_tmpl_id.x_studio_tipus_calcul or 'uds'
        if line.x_studio_uds <= 0 or line.product_uom_qty <= 0:
            errors.append(line.product_id.display_name + ': cal una quantitat positiva.')
        if kind in ['m2', 'ml'] and line.x_studio_long <= 0:
            errors.append(line.product_id.display_name + ': falta una longitud positiva.')
        if kind == 'm2' and line.x_studio_ancho_1 <= 0:
            errors.append(line.product_id.display_name + ': falta una amplada positiva.')
    if errors:
        raise UserError('No es pot acceptar el pressupost:\n' + '\n'.join(errors))
    purchase_action_id = env['ir.config_parameter'].sudo().get_param('mnl.purchase_flow_action_id')
    if purchase_action_id:
        env['ir.actions.server'].sudo().browse(int(purchase_action_id)).with_context(active_model='sale.order', active_id=order.id, active_ids=order.ids, mnl_purchase_validate_only=True).run()
    issued = order.x_mnl_issued_at or previous.get('date_order') or order.date_order
    confirmed = datetime.datetime.now()
    language = order.x_studio_idioma_document or order.partner_id.lang or 'ca_ES'
    customer = order.partner_invoice_id.commercial_partner_id.with_context(lang=language)
    customer_parts = [customer.name or '', ('NIF/CIF: ' + customer.vat) if customer.vat else '', customer.street or '', customer.street2 or '',
                      ((customer.zip or '') + ' ' + (customer.city or '')).strip(), customer.country_id.name or '', ('Telèfon: ' + customer.phone) if customer.phone else '', ('Correu: ' + customer.email) if customer.email else '']
    customer_text = '\n'.join(part for part in customer_parts if part)
    snapshots = []
    language = order.x_studio_idioma_document or order.partner_id.lang or 'ca_ES'
    for line in product_lines:
        article = line.product_id.with_context(lang=language, display_default_code=False).display_name
        line_values = {'x_mnl_accepted_article': article, 'x_mnl_accepted_class': line.x_studio_classificador or '',
                       'x_mnl_accepted_units': line.x_studio_uds, 'x_mnl_accepted_length': line.x_studio_long,
                       'x_mnl_accepted_width': line.x_studio_ancho_1,
                       'x_mnl_accepted_kind': line.product_id.product_tmpl_id.x_studio_tipus_calcul or 'uds',
                       'x_mnl_accepted_qty': line.product_uom_qty, 'x_mnl_accepted_price': line.price_unit,
                       'x_mnl_accepted_net': line.price_subtotal}
        line.with_context(mnl_flow_internal=internal_token).write(line_values)
        snapshots.append({'line_id': line.id, 'product_id': line.product_id.id,
                          'unit_id': line.product_uom_id.id, 'tax_ids': line.tax_ids.ids,
                          'discount': line.discount, 'values': line_values})
    values = {'x_mnl_frozen': True, 'locked': True, 'x_mnl_issued_at': issued,
              'x_mnl_confirmed_at': confirmed,
              'x_mnl_accepted_ref': order.name, 'x_mnl_accepted_revision': order.x_studio_revisio or 'A',
              'x_mnl_accepted_customer': customer_text,
              'x_mnl_accepted_contact': order.x_studio_contacte_pressupost_id.name or '',
              'x_mnl_accepted_language': language,
              'x_mnl_accepted_snapshot': str({'reference': order.name, 'revision': order.x_studio_revisio or 'A',
                  'customer': customer_text, 'contact': order.x_studio_contacte_pressupost_id.name or '',
                  'issued': str(issued), 'confirmed': str(confirmed), 'payment_term_id': order.payment_term_id.id,
                  'currency_id': order.currency_id.id, 'net': order.amount_untaxed, 'tax': order.amount_tax,
                  'total': order.amount_total, 'conditions': order.x_studio_condicions_acceptacio or '', 'lines': snapshots})}
    order.with_context(mnl_flow_internal=internal_token).write(values)
    pdf, kind = env['ir.actions.report'].sudo().with_context(mnl_render_accepted_quotation=True)._render_qweb_pdf(
        'mnl_solutions.report_quotation_standard', res_ids=order.ids)
    attachment = env['ir.attachment'].sudo().create({'name': 'Pressupost acceptat - ' + order.x_mnl_accepted_ref + '.pdf',
                  'type': 'binary', 'raw': pdf, 'mimetype': 'application/pdf', 'res_model': 'sale.order', 'res_id': order.id})
    order.with_context(mnl_flow_internal=internal_token).write({'x_mnl_accepted_document_id': attachment.id})
    if purchase_action_id:
        env['ir.actions.server'].sudo().browse(int(purchase_action_id)).with_context(active_model='sale.order', active_id=order.id, active_ids=order.ids, mnl_purchase_validate_only=False).run()
action = {'type': 'ir.actions.act_window_close'}
