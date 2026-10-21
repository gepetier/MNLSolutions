# Called inside sale confirmation: validation and draft purchases share its transaction.
validate_only = env.context.get('mnl_purchase_validate_only', False)
for order in records:
    if order.state != 'sale':
        continue
    if not validate_only and order.x_mnl_purchase_generated:
        # A completed generation is never repeated, even if its RFQs were cancelled.
        continue
    lines = order.order_line.filtered(lambda row: not row.display_type and row.product_id)
    prepared = []
    errors = []
    for line in lines:
        product = line.product_id.with_company(order.company_id)
        if not product.purchase_ok:
            errors.append(product.display_name + ': activa la compra del producte i defineix el proveïdor.')
            continue
        seller = product._select_seller(quantity=line.product_uom_qty,
            date=datetime.date.today(), uom_id=line.product_uom_id, ordered_by='sequence')
        if not seller or not seller.partner_id.active:
            errors.append(product.display_name + ': manca un proveïdor aplicable a la variant, data i quantitat.')
            continue
        if seller.company_id and seller.company_id != order.company_id:
            errors.append(product.display_name + ': el proveïdor no correspon a aquesta empresa.')
            continue
        if seller.price < 0:
            errors.append(product.display_name + ': el preu de compra no pot ser negatiu.')
            continue
        unit = seller.uom_id or product.uom_id
        allowed_units = product.uom_id | product.uom_ids
        if unit not in allowed_units or line.product_uom_id not in allowed_units:
            errors.append(product.display_name + ': defineix la unitat de compra/venda com a unitat base o envàs del producte abans de convertir-la.')
            continue
        quantity = line.product_uom_id._compute_quantity(line.product_uom_qty, unit, round=False)
        restored = unit._compute_quantity(quantity, line.product_uom_id, round=False)
        if quantity <= 0 or abs(restored - line.product_uom_qty) > 0.00001:
            errors.append(product.display_name + ': conversió d’unitats de compra incoherent.')
            continue
        prepared.append((line, seller, unit, quantity))
    if errors:
        raise UserError('No es pot confirmar la comanda ni preparar les compres:\n' + '\n'.join(errors))
    if validate_only:
        continue
    if not order.x_mnl_frozen or not order.x_mnl_accepted_document_id:
        raise UserError('Cal conservar la versió acceptada abans de generar les compres.')
    Purchase = env['purchase.order'].sudo().with_company(order.company_id)
    PurchaseLine = env['purchase.order.line'].sudo().with_company(order.company_id)
    existing = Purchase.search([('x_mnl_source_order_id', '=', order.id)])
    if existing or PurchaseLine.search([('sale_line_id', 'in', lines.ids)], limit=1):
        raise UserError('Ja hi ha compres vinculades a aquesta comanda. Revisa-les abans de generar-ne més.')
    by_vendor = {}
    purchase_ids = []
    for line, seller, unit, quantity in prepared:
        partner = seller.partner_id
        if partner.id not in by_vendor:
            purchase = Purchase.create({'partner_id': partner.id, 'company_id': order.company_id.id,
                'origin': order.x_mnl_accepted_ref, 'x_mnl_source_order_id': order.id,
                'x_mnl_source_ref': order.x_mnl_accepted_ref,
                'x_mnl_source_revision': order.x_mnl_accepted_revision,
                'note': 'Esborrany generat des de la comanda acceptada. Revisar preus, impostos, unitats i terminis abans de confirmar o enviar.'})
            by_vendor[partner.id] = purchase
            purchase_ids.append(purchase.id)
        purchase = by_vendor[partner.id]
        values = PurchaseLine._prepare_purchase_order_line(line.product_id, quantity, unit, order.company_id, partner, purchase)
        values.update({'sale_line_id': line.id, 'x_mnl_source_supplierinfo_id': seller.id,
            'x_mnl_units': line.x_mnl_accepted_units, 'x_mnl_length': line.x_mnl_accepted_length,
            'x_mnl_width': line.x_mnl_accepted_width, 'x_mnl_kind': line.x_mnl_accepted_kind,
            'name': (('[' + seller.product_code + '] ') if seller.product_code else '')
                + (seller.product_name or line.x_mnl_accepted_article) + '\nUnitats: ' + str(line.x_mnl_accepted_units)
                + ' · Longitud (m): ' + str(line.x_mnl_accepted_length)
                + ' · Amplada (m): ' + str(line.x_mnl_accepted_width)})
        if not seller.price:
            values['name'] += '\nPREU DE COMPRA PENDENT DE REVISIÓ (tarifa a zero).'
        # Use the exact rule selected above; the native helper may choose another break.
        product_taxes = line.product_id.supplier_taxes_id.filtered(lambda tax: not tax.company_id or tax.company_id == order.company_id)
        mapped_taxes = purchase.fiscal_position_id.map_tax(product_taxes)
        price = seller.uom_id._compute_price(seller.price, unit) if seller.uom_id else seller.price
        price = env['account.tax']._fix_tax_included_price_company(price, product_taxes, mapped_taxes, order.company_id)
        values['price_unit'] = seller.currency_id._convert(price, purchase.currency_id, order.company_id, purchase.date_order.date())
        values['discount'] = seller.discount or 0.0
        values['date_planned'] = PurchaseLine._get_date_planned(seller, po=purchase)
        values['tax_ids'] = [(6, 0, mapped_taxes.ids)]
        PurchaseLine.create(values)
    token = env['ir.config_parameter'].sudo().get_param('mnl.sales_flow_internal_token')
    order.with_context(mnl_flow_internal=token).write({'x_mnl_purchase_generated': True,
        'x_mnl_purchase_order_ids': [(6, 0, purchase_ids)]})
action = {'type': 'ir.actions.act_window_close'}
