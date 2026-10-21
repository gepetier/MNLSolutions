internal_token = env['ir.config_parameter'].sudo().get_param('mnl.sales_flow_internal_token')
# Trigger on commercial writes, create and unlink, not invoicing/delivery counters.
if not internal_token or env.context.get('mnl_flow_internal') != internal_token:
    for line in records:
        previous_order = ((env.context.get('old_values') or {}).get(line.id, {})).get('order_id')
        if line.order_id.x_mnl_frozen or (previous_order and previous_order.x_mnl_frozen):
            raise UserError('Les línies de la versió acceptada estan congelades. Crea un pressupost nou per modificar-les.')
action = {'type': 'ir.actions.act_window_close'}
