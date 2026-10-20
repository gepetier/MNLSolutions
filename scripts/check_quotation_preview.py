"""Compare rendered quotation rows with a private snapshot from the same order."""
import json
import sys
from decimal import Decimal
from html.parser import HTMLParser
from pathlib import Path

class Rows(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows = []
        self.current = None
        self.cell = None
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'tr' and 'data-line-id' in attrs:
            self.current = {'id': int(attrs['data-line-id']), 'cells': []}
        elif tag == 'td' and self.current is not None:
            self.cell = []
    def handle_data(self, data):
        if self.cell is not None:
            self.cell.append(data)
    def handle_endtag(self, tag):
        if tag == 'td' and self.cell is not None:
            self.current['cells'].append(''.join(self.cell).strip())
            self.cell = None
        elif tag == 'tr' and self.current is not None:
            self.rows.append(self.current)
            self.current = None

def number(value):
    s = value.replace('\u00a0', '').replace(' ', '')
    if ',' in s:
        s = s.replace('.', '').replace(',', '.')
    return Decimal(s)

html = Path(sys.argv[1]).read_text()
snapshot = json.loads(Path(sys.argv[2]).read_text())
assert 'DESCRIPCIO_INTERNA_NO_PUBLICAR_123' not in html, 'Product description leaked'
for label in ['Marge de benefici', 'Preu unitari base', 'Marge obj.', 'Marge real']:
    assert label not in html, 'Internal column leaked: ' + label
p = Rows()
p.feed(html)
expected = [line for line in snapshot['lines'] if not line['display_type']]
assert [r['id'] for r in p.rows] == [line['id'] for line in expected], 'Row order/grouping changed'
v3 = '--v3' in sys.argv
columns = 9 if v3 else 11
fields = ({2:'x_studio_uds', 5:'product_uom_qty', 7:'price_unit', 8:'price_subtotal'} if v3
          else {2:'x_studio_uds', 5:'product_uom_qty', 8:'price_unit', 9:'price_subtotal', 10:'price_total'})
if v3:
    assert '<br' not in html.split('<thead>', 1)[1].split('</thead>', 1)[0], 'Multiline header markup'
    assert 'class="product-code"' not in html, 'Product code still visible'
    by_id = {row['id']: row for row in p.rows}
    previous = None
    for line in snapshot['lines']:
        if line['display_type']:
            previous = None
            continue
        cells = by_id[line['id']]['cells']
        if previous and previous['product_id'][0] == line['product_id'][0]:
            assert not cells[0] and not cells[1], 'Repeated product labels still visible'
        else:
            assert cells[0] and cells[1], 'First product labels missing'
        previous = line
for row, line in zip(p.rows, expected):
    assert len(row['cells']) == columns, 'Incorrect column count'
    for index, field in fields.items():
        assert abs(number(row['cells'][index]) - Decimal(str(line[field]))) <= Decimal('0.005'), (row['id'], field, row['cells'][index], line[field])
print(json.dumps({'checkedProductRows':len(expected), 'columns':columns, 'sameOrderAndValues':True, 'productDescriptions':False, 'internalMargins':False}))
