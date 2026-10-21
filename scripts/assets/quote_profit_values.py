def mnl_profit_values(line):
    if 'x_mnl_profit_nominal' not in line._fields or not env['ir.config_parameter'].sudo().get_param('mnl.quote_profit.enabled'):
        return {}
    product = line.product_id
    if line.display_type or not product or line.is_downpayment or line.x_mnl_is_portes or product.default_code == 'MNL-PORTES' or (product.name or '').strip().lower() in ['descuento', 'descompte', 'discount']:
        return {}
    if line.order_id and line.order_id.state not in ['draft', 'sent']:
        return {}
    initialized = line.x_mnl_profit_initialized
    nominal = line.x_mnl_profit_nominal or 0.0
    percent = line.x_mnl_profit_percent or 0.0
    mode = line.x_mnl_profit_mode or 'nominal'
    base = line.x_mnl_profit_base_price or 0.0
    changed_nominal = abs(nominal - (line.x_mnl_profit_last_nominal or 0.0)) > 0.0000001
    changed_percent = abs(percent - (line.x_mnl_profit_last_percent or 0.0)) > 0.0000001
    if not initialized:
        base = base if base else line.price_unit
    elif line.x_mnl_profit_product != product.id:
        # A different variant supplies a fresh native base; never reuse its old final price.
        base = line.price_unit if abs(line.price_unit - line.x_mnl_profit_last_final) > 0.0000001 else product.lst_price
    elif not changed_nominal and not changed_percent and abs(base - line.x_mnl_profit_last_base) <= 0.0000001 and abs(line.price_unit - line.x_mnl_profit_last_final) > 0.0000001:
        # Native pricelist updates and API price writes supply a new base.
        base = line.price_unit
    if base < 0.0 or nominal < 0.0 or percent < 0.0:
        raise UserError('El preu base i els marges de benefici han de ser positius o zero.')
    if changed_nominal and changed_percent:
        expected = nominal / base * 100.0 if base else 0.0
        if abs(expected - percent) > 0.0001:
            raise UserError('Edita un sol marge cada vegada: nominal o percentual.')
    if changed_percent and not changed_nominal:
        mode = 'percent'
    elif changed_nominal:
        mode = 'nominal'
    target = percent if changed_percent else line.x_mnl_profit_percent_target
    precision = env['decimal.precision'].precision_get('Product Price')
    if mode == 'percent':
        if target < 0.0:
            raise UserError('L’increment percentual sobre el preu base no pot ser negatiu.')
        final = round(base * (1.0 + target / 100.0), precision)
        nominal = final - base
    else:
        final = round(base + nominal, precision)
        nominal = final - base
    actual_percent = nominal / base * 100.0 if base else 0.0
    values = {
        'price_unit': final,
        'x_mnl_profit_base_price': base,
        'x_mnl_profit_nominal': nominal,
        'x_mnl_profit_percent': actual_percent,
        'x_mnl_profit_mode': mode,
        'x_mnl_profit_percent_target': target if mode == 'percent' else actual_percent,
        'x_mnl_profit_initialized': True,
        'x_mnl_profit_product': product.id,
        'x_mnl_profit_last_nominal': nominal,
        'x_mnl_profit_last_percent': actual_percent,
        'x_mnl_profit_last_base': base,
        'x_mnl_profit_last_final': final,
    }
    # Keep price_unit in quantity writes so the native compute cannot replace the
    # chosen base/final while the dimensional quantity is being persisted.
    return {key: value for key, value in values.items() if key == 'price_unit' or line[key] != value}
