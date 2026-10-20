internal_token = env['ir.config_parameter'].sudo().get_param('mnl.sales_flow_internal_token')
if not internal_token or env.context.get('mnl_flow_internal') != internal_token:
    for invoice in records:
        if invoice.move_type != 'out_invoice' or invoice.state == 'cancel':
            continue
        sources = invoice.invoice_line_ids.mapped('sale_line_ids.order_id')
        if not sources:
            if invoice.x_mnl_source_order_ids:
                raise UserError('No es poden eliminar totes les línies d’origen d’una factura MNL.')
            continue
        products = invoice.invoice_line_ids.filtered(lambda row: row.display_type == 'product')
        if any(not row.sale_line_ids for row in products):
            raise UserError('Tots els articles de la factura MNL han de tenir una línia acceptada d’origen.')
        expected = sources.mapped('order_line').filtered(lambda row: not row.display_type and row.product_id)
        if set(products.mapped('sale_line_ids').ids) != set(expected.ids):
            raise UserError('Aquest primer flux genera una factura total; han de constar totes les línies de les comandes seleccionades.')
        if any(not order.x_mnl_frozen or not order.x_mnl_accepted_document_id for order in sources):
            raise UserError('Totes les comandes de la factura han de tenir una versió acceptada congelada.')
        if not invoice.partner_id.commercial_partner_id.vat:
            raise UserError('Completa el NIF/CIF del client abans de crear o comptabilitzar la factura.')
        first = sources.sorted('id')[0]
        for order in sources:
            if order.partner_invoice_id.commercial_partner_id != invoice.partner_id.commercial_partner_id:
                raise UserError('Les comandes agrupades han de correspondre al mateix client fiscal de la factura.')
            if order.currency_id != invoice.currency_id or order.payment_term_id != invoice.invoice_payment_term_id:
                raise UserError('La moneda i el termini de pagament han de coincidir amb totes les comandes acceptades.')
            if order.x_mnl_accepted_language != first.x_mnl_accepted_language:
                raise UserError('Agrupa en una factura només comandes acceptades en el mateix idioma.')
        references = []
        contacts = []
        conditions = []
        for order in sources.sorted('id'):
            references.append(order.x_mnl_accepted_ref + ' · rev. ' + order.x_mnl_accepted_revision)
            if order.x_studio_condicions_acceptacio:
                conditions.append(order.x_mnl_accepted_ref + '\n' + order.x_studio_condicions_acceptacio)
            if order.x_mnl_accepted_contact and order.x_mnl_accepted_contact not in contacts:
                contacts.append(order.x_mnl_accepted_contact)
        fiscal = invoice.partner_id.commercial_partner_id.with_context(lang=first.x_mnl_accepted_language)
        fiscal_parts = [fiscal.name or '', 'NIF/CIF: ' + fiscal.vat, fiscal.street or '', fiscal.street2 or '', ((fiscal.zip or '') + ' ' + (fiscal.city or '')).strip(), fiscal.country_id.name or '', ('Telèfon: ' + fiscal.phone) if fiscal.phone else '', ('Correu: ' + fiscal.email) if fiscal.email else '']
        customer_block = invoice.x_mnl_customer_block or '\n'.join(part for part in fiscal_parts if part)
        values = {'x_mnl_source_order_ids': [(6, 0, sources.ids)], 'x_mnl_source_summary': '\n'.join(references),
                  'x_mnl_customer_block': customer_block, 'x_mnl_contact': '\n'.join(contacts),
                  'x_mnl_document_language': first.x_mnl_accepted_language, 'x_mnl_source_conditions': '\n\n'.join(conditions)}
        invoice.with_context(mnl_flow_internal=internal_token).write(values)
action = {'type': 'ir.actions.act_window_close'}
