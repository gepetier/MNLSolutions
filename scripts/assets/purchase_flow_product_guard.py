# New saleable products must carry a native vendor rule in the same create operation.
for product in records:
    if product.sale_ok:
        if not product.purchase_ok or not product.seller_ids.filtered(lambda seller: seller.partner_id.active):
            raise UserError('Per crear un producte de venda, activa «Es pot comprar» i defineix almenys un proveïdor a la pestanya Compra. No es pot crear un producte de venda sense proveïdor.')
action = {'type': 'ir.actions.act_window_close'}
