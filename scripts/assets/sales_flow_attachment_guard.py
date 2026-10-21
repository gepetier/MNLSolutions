# Only the PDF explicitly retained as the accepted version is protected.
internal_token = env['ir.config_parameter'].sudo().get_param('mnl.sales_flow_internal_token')
if not internal_token or env.context.get('mnl_flow_internal') != internal_token:
    for attachment in records:
        accepted = env['sale.order'].sudo().search([('x_mnl_frozen', '=', True),
            ('x_mnl_accepted_document_id', '=', attachment.id)], limit=1)
        if accepted:
            previous = (env.context.get('old_values') or {}).get(attachment.id, {})
            if not previous or any(key not in ['access_token', 'index_content'] for key in previous):
                raise UserError('El PDF de la versió acceptada està congelat i no es pot modificar ni eliminar.')
action = {'type': 'ir.actions.act_window_close'}
