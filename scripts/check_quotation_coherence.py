"""Validate a private Odoo quotation snapshot without connecting or writing to Odoo.

Input: {"order": {...}, "lines": [...]}. Monetary totals use the native
document values. A difference between summed gross rows and the global total
is reported separately because the company may round taxes globally.
"""
import argparse
import json
import re
from collections import defaultdict
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path


def validate(snapshot, quantity_decimals=2):
    order = snapshot['order']
    lines = [line for line in snapshot['lines'] if not line['display_type']]
    issues = []
    warnings = []
    groups = defaultdict(Decimal)
    quantum = Decimal(1).scaleb(-quantity_decimals)
    money_tolerance = Decimal('0.011')

    def num(value):
        return Decimal(str(value or 0))

    def check(identifier, field, actual, expected, tolerance=Decimal('0.0001')):
        if abs(num(actual) - num(expected)) > tolerance:
            issues.append({'id': identifier, 'field': field,
                           'actual': str(actual), 'expected': str(expected)})

    for line in lines:
        product = line['product_id']
        if not product:
            issues.append({'id': line['id'], 'field': 'product_id', 'error': 'missing'})
            continue
        groups[product[0]] += num(line['product_uom_qty'])

    for line in lines:
        identifier = line['id']
        kind = line['x_studio_tipus_calcul'] or 'uds'
        if num(line['x_studio_uds']) <= 0:
            warnings.append({'id': identifier, 'field': 'x_studio_uds', 'warning': 'nonpositive_units'})
        for field in (['x_studio_long', 'x_studio_ancho_1'] if kind == 'm2'
                      else ['x_studio_long'] if kind == 'ml' else []):
            if num(line[field]) <= 0:
                warnings.append({'id': identifier, 'field': field, 'warning': 'incomplete_dimensions'})
        quantity = num(line['x_studio_uds'])
        if kind in ('m2', 'ml'):
            quantity *= num(line['x_studio_long'])
        if kind == 'm2':
            quantity *= num(line['x_studio_ancho_1'])
        if kind not in ('m2', 'ml', 'uds'):
            issues.append({'id': identifier, 'field': 'x_studio_tipus_calcul', 'error': 'unknown'})
        check(identifier, 'dimensional_quantity', line['product_uom_qty'],
              quantity.quantize(quantum, rounding=ROUND_HALF_UP))
        check(identifier, 'x_studio_cantidad', line['x_studio_cantidad'], line['product_uom_qty'])
        check(identifier, 'x_studio_importe_mnl', line['x_studio_importe_mnl'], line['price_subtotal'])
        if line['product_id']:
            check(identifier, 'x_studio_total', line['x_studio_total'], groups[line['product_id'][0]])
        if num(line['discount']):
            issues.append({'id': identifier, 'field': 'discount', 'error': 'discounts_on_standby'})
        if line.get('x_mnl_profit_initialized') and not line.get('x_mnl_is_portes'):
            check(identifier, 'final_price_from_base_and_nominal', line['price_unit'],
                  num(line['x_mnl_profit_base_price']) + num(line['x_mnl_profit_nominal']), money_tolerance)
            if num(line['x_mnl_profit_base_price']):
                check(identifier, 'markup_on_base_price', line['x_mnl_profit_percent'],
                      num(line['x_mnl_profit_nominal']) / num(line['x_mnl_profit_base_price']) * 100)

    net = sum((num(line['price_subtotal']) for line in lines), Decimal(0))
    gross = sum((num(line['price_total']) for line in lines), Decimal(0))
    check(order['id'], 'amount_untaxed', order['amount_untaxed'], net, money_tolerance)
    check(order['id'], 'amount_total', order['amount_total'],
          num(order['amount_untaxed']) + num(order['amount_tax']), money_tolerance)
    if not order.get('payment_term_id'):
        warnings.append({'id': order['id'], 'field': 'payment_term_id', 'warning': 'missing_payment'})
    acceptance = order.get('x_studio_condicions_acceptacio') or ''
    date = re.search(r'(?:vàlida?\s+fins(?:\s+al)?|válida?\s+hasta(?:\s+el)?|valid\s+until)\s+(\d{2})/(\d{2})/(\d{4})', acceptance, re.I)
    if date and order.get('validity_date'):
        day, month, year = date.groups()
        if f'{year}-{month}-{day}' != order['validity_date']:
            warnings.append({'id': order['id'], 'field': 'x_studio_condicions_acceptacio',
                             'warning': 'manual_validity_date_disagrees'})
    return {'productRows': len(lines), 'issues': issues, 'warnings': warnings,
            'grossRowSumMinusDocumentTotal': str(gross - num(order['amount_total']))}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('snapshot', type=Path)
    parser.add_argument('--quantity-decimals', type=int, default=2)
    args = parser.parse_args()
    result = validate(json.loads(args.snapshot.read_text()), args.quantity_decimals)
    print(json.dumps(result, ensure_ascii=False))
    raise SystemExit(bool(result['issues']))
