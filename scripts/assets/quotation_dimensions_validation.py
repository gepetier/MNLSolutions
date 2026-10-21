# Odoo server action: read-only validation scoped to the active sale orders.
errors = []
for order in records:
    for line in order.order_line.sorted(key=lambda row: (row.sequence, row.id)):
        if line.display_type or not line.product_id:
            continue
        kind = line.product_id.product_tmpl_id.x_studio_tipus_calcul or 'uds'
        missing = []
        if kind in ['m2', 'ml'] and line.x_studio_long <= 0:
            missing.append('longitud positiva')
        if kind == 'm2' and line.x_studio_ancho_1 <= 0:
            missing.append('amplada positiva')
        if missing:
            errors.append({
                'line_id': line.id,
                'label': (line.x_studio_classificador or '') + ' ' + line.product_id.display_name,
                'message': ', '.join(missing),
            })
if errors and env.context.get('mnl_raise_dimensions', True):
    details = '\n'.join(error['label'].strip() + ': ' + error['message'] for error in errors)
    raise UserError('Completa les dimensions abans de generar el pressupost.\n\n' + details + '\n\nEls articles per unitats no necessiten dimensions.')
action = {'type': 'ir.actions.act_window_close', 'mnl_valid': not errors, 'mnl_errors': errors}
