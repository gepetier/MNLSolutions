# Shared pure helpers for Odoo safe_eval. datetime and UserError are supplied by Odoo.
def mnl_validity_references(text, order_date):
    prefixes = [
        ('vàlida fins al', 'date'), ('vàlid fins al', 'date'), ('vàlid fins a', 'date'),
        ('valida fins al', 'date'), ('valid fins a', 'date'),
        ('válida hasta el', 'date'), ('válido hasta el', 'date'),
        ('válida hasta', 'date'), ('válido hasta', 'date'),
        ('valida hasta', 'date'), ('valido hasta', 'date'), ('valid until', 'date'),
        ('vàlida durant', 'days'), ('vàlid durant', 'days'), ('valida durant', 'days'),
        ('válida durante', 'days'), ('válido durante', 'days'),
        ('valida durante', 'days'), ('valido durante', 'days'), ('valid for', 'days'),
    ]
    lowered = text.lower()
    references = []
    seen = []
    for prefix, kind in prefixes:
        offset = 0
        while True:
            position = lowered.find(prefix, offset)
            if position < 0:
                break
            start = position + len(prefix)
            while start < len(text) and text[start] in ' :\t\n':
                start += 1
            end = start
            while end < len(text) and text[end] in '0123456789/-':
                end += 1
            if start == end or start in seen:
                offset = position + len(prefix)
                continue
            token = text[start:end]
            iso = False
            try:
                if kind == 'days':
                    if not order_date:
                        raise UserError('Cal una data de pressupost per calcular els dies de validesa.')
                    target = order_date + datetime.timedelta(days=int(token))
                else:
                    parts = token.replace('-', '/').split('/')
                    if len(parts) != 3:
                        raise Exception('date')
                    iso = len(parts[0]) == 4
                    year, month, day = (int(parts[0]), int(parts[1]), int(parts[2])) if iso else (int(parts[2]), int(parts[1]), int(parts[0]))
                    target = datetime.date(year, month, day)
            except Exception:
                raise UserError('Data de validesa no vàlida. Utilitza DD/MM/AAAA o AAAA-MM-DD; els dies han de ser un nombre enter.')
            clause_start = position
            for lead in ['oferta ', 'offer ']:
                if position >= len(lead) and lowered[position-len(lead):position] == lead:
                    clause_start = position-len(lead)
            clause_end = end
            if kind == 'days':
                for suffix in [' dies', ' días', ' dias', ' days']:
                    if lowered[end:end+len(suffix)] == suffix:
                        clause_end = end+len(suffix)
                        break
            if text[clause_end:clause_end+1] == '.':
                clause_end += 1
            references.append({'start': start, 'end': end, 'clause_start': clause_start, 'clause_end': clause_end, 'target': target, 'kind': kind, 'iso': iso})
            seen.append(start)
            offset = end
    return sorted(references, key=lambda ref: ref['start'])


def mnl_validity_values(order, source, supplied=None, previous_text=''):
    text = order.x_studio_condicions_acceptacio or ''
    date = order.validity_date or False
    order_date = order.date_order.date() if order.date_order else False
    refs = mnl_validity_references(text, order_date)
    if source == 'auto':
        if supplied is None:
            source = 'text' if refs else 'date'
        else:
            text_changed = 'x_studio_condicions_acceptacio' in supplied and text != (supplied['x_studio_condicions_acceptacio'] or '')
            date_changed = 'validity_date' in supplied and date != (supplied['validity_date'] or False)
            if text_changed and date_changed:
                differs = False
                for ref in refs:
                    if ref['target'] != date:
                        differs = True
                if differs:
                    raise UserError('La data de validesa i les condicions indiquen valors diferents. Edita un sol valor o fes que coincideixin.')
                source = 'date'
            else:
                source = 'text' if text_changed else 'date'
            previous_text = supplied.get('x_studio_condicions_acceptacio', previous_text) or ''
    if source == 'text':
        if refs:
            date = refs[0]['target']
            differs = False
            for ref in refs:
                if ref['target'] != date:
                    differs = True
            if differs:
                raise UserError('Les condicions contenen diverses valideses diferents. Indica una única validesa.')
        elif mnl_validity_references(previous_text, order_date):
            date = False
    for ref in refs[::-1]:
        if not date:
            text = text[:ref['clause_start']] + text[ref['clause_end']:]
        else:
            if ref['kind'] == 'days':
                replacement = str((date-order_date).days)
            else:
                replacement = date.isoformat() if ref['iso'] else '%02d/%02d/%04d' % (date.day, date.month, date.year)
            text = text[:ref['start']] + replacement + text[ref['end']:]
    if date and not refs:
        language = order.x_studio_idioma_document or 'ca_ES'
        label = {'ca_ES': 'Oferta vàlida fins al ', 'es_ES': 'Oferta válida hasta el ', 'en_US': 'Offer valid until '}.get(language, 'Oferta vàlida fins al ')
        formatted = date.isoformat() if language == 'en_US' else '%02d/%02d/%04d' % (date.day, date.month, date.year)
        text = text.rstrip() + ('\n' if text.strip() else '') + label + formatted + '.'
    values = {}
    if (order.validity_date or False) != date:
        values['validity_date'] = date
    if (order.x_studio_condicions_acceptacio or '') != text.strip():
        values['x_studio_condicions_acceptacio'] = text.strip()
    days = (date-order_date).days if date and order_date else 0
    if order.x_studio_validesa_dies != days:
        values['x_studio_validesa_dies'] = days
    return values
