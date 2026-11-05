"""Offline read-only audit of pg_dump COPY data. Never executes SQL or Odoo code.

Usage: python3 scripts/audit_code_cost.py backup/dump.sql --output PRIVATE_DIR
Counts reproduce the Python AST algorithm of Odoo saas-19.3 cloc.py.
Not an Odoo-issued invoice certification; filesystem modules need separate review.
"""
import argparse
import ast
import csv
import hashlib
import json
import math
import re
from pathlib import Path

TABLES = {'base_automation_ir_model_fields_rel', 'base_automation_onchange_fields_rel',
          'ir_act_server', 'base_automation', 'ir_model_fields', 'ir_model_data',
          'ir_module_module', 'ir_ui_view', 'ir_model', 'ir_asset', 'ir_attachment',
          'ir_act_report_xml', 'ir_act_window', 'ir_ui_menu'}

def decode(value):
    if value == r'\N':
        return None
    escapes = {'n': '\n', 'r': '\r', 't': '\t', 'b': '\b', 'f': '\f', 'v': '\v', '\\': '\\'}
    return re.sub(r'\\([0-7]{1,3}|x[0-9a-fA-F]{1,2}|.)', lambda m: chr(int(m[1], 8)) if m[1][0] in '01234567' else chr(int(m[1][1:], 16)) if m[1].startswith('x') and len(m[1]) > 1 else escapes.get(m[1], m[1]), value)

def load_dump(path):
    tables = {}
    current = None
    with open(path, encoding='utf-8') as stream:
        for line in stream:
            if current:
                if line.rstrip('\n') == r'\.':
                    current = None
                else:
                    vals = line.rstrip('\n').split('\t')
                    if len(vals) != len(columns):
                        raise ValueError('COPY column mismatch')
                    tables[current].append(dict(zip(columns, map(decode, vals))))
            elif line.startswith('COPY public.'):
                match = re.match(r'COPY public\.(\w+) \((.*?)\) FROM stdin;', line)
                if match and match[1] in TABLES:
                    current = match[1]
                    columns = match[2].split(', ')
                    tables[current] = []
    return tables

def py_count(source):
    try:
        tree = ast.parse((source or '').strip() + '\n')
        return len({node.lineno for node in ast.walk(tree) if hasattr(node, 'lineno')})
    except SyntaxError:
        return None

def label(value):
    try:
        names = json.loads(value)
        return names.get('ca_ES') or names.get('es_ES') or names.get('en_US') or value
    except (TypeError, ValueError, AttributeError):
        return value

def audit(tables):
    modules = {m['name']: m for m in tables.get('ir_module_module', [])}
    models = {m['id']: m['model'] for m in tables.get('ir_model', [])}
    external = {}
    for d in tables.get('ir_model_data', []):
        external.setdefault((d['model'], d['res_id']), []).append(d)
    automations = {a['id']: a for a in tables.get('base_automation', [])}
    result = []
    for table, model, field in [('ir_act_server', 'ir.actions.server', 'code'), ('ir_model_fields', 'ir.model.fields', 'compute')]:
        for r in tables.get(table, []):
            ids = external.get((model, r['id']), [])
            origin = [d['module'] for d in ids]
            imported = lambda name: name in modules and modules[name].get('imported') == 't' and modules[name]['state'] == 'installed'
            if table == 'ir_act_server':
                eligible = r['state'] == 'code' and (not ids or any(d['module'] not in modules or imported(d['module']) for d in ids))
            else:
                eligible = r['state'] == 'manual' and r.get('compute') is not None and not ('studio_customization' in origin and not r['name'].startswith('x_studio'))
            if not eligible and not (table == 'ir_model_fields' and r['state'] == 'manual'):
                continue
            source = r.get(field) or ''
            a = automations.get(r.get('base_automation_id'))
            excluded = '__cloc_exclude__' in origin
            result.append(dict(model=model, id=r['id'], name=label(r['name']), affected_model=r.get('model') or models.get(r.get('model_id')), state=r['state'], automation_id=r.get('base_automation_id'), automation_name=label(a['name']) if a else None, automation_active=a.get('active') if a else None, binding_model_id=r.get('binding_model_id'), eligible=eligible, excluded=excluded, estimated_cloc=py_count(source) if eligible and not excluded else 0, physical_lines=len(source.splitlines()), source=source, sha256=hashlib.sha256(source.encode()).hexdigest(), xml_ids=[d['module']+'.'+d['name'] for d in ids], depends=r.get('depends'), related=r.get('related'), write_date=r.get('write_date')))
    return result

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('dump')
    parser.add_argument('--output', required=True)
    parser.add_argument('--previous', help='Previous private inventory.json for change alerts')
    parser.add_argument('--official-total', type=int, help='Fresh Count LoC result; never inferred')
    parser.add_argument('--block-rate', type=float, required=True, help='Contractual monthly price per 100 lines, excluding tax')
    args = parser.parse_args()
    tables = load_dump(args.dump)
    records = audit(tables)
    out = Path(args.output)
    out.mkdir(parents=True, exist_ok=True)
    (out/'inventory.json').write_text(json.dumps(records, ensure_ascii=False, indent=2))
    # Preserve technical rows only. No business tables, users or system secrets exported.
    (out/'technical.json').write_text(json.dumps(tables, ensure_ascii=False, indent=2))
    with (out/'inventory.csv').open('w') as f:
        keys = [k for k in records[0] if k != 'source']
        writer = csv.DictWriter(f, fieldnames=keys, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(records)
    source_dir = out/'source'
    source_dir.mkdir(exist_ok=True)
    for r in records:
        if r['source']:
            (source_dir/(r['model']+'-'+r['id']+'.py')).write_text(r['source'])
    total = sum(r['estimated_cloc'] or 0 for r in records)
    if args.block_rate < 0:
        parser.error('--block-rate cannot be negative')
    summary = dict(dump_sha256=hashlib.sha256(Path(args.dump).read_bytes()).hexdigest(), tables={k:len(v) for k,v in tables.items()}, python_estimated=total, blocks=math.ceil(total/100), monthly_estimated=args.block_rate*math.ceil(total/100), syntax_errors=[r['id'] for r in records if r['estimated_cloc'] is None], limitations=['Offline snapshot; not live Count LoC', 'Imported QWeb/assets and filesystem modules must be reconciled separately', 'Activation and billing effective dates require Odoo confirmation'])
    if args.official_total is not None:
        summary['official_total'] = args.official_total
        summary['matches_official'] = total == args.official_total
    if args.previous:
        previous = json.loads(Path(args.previous).read_text())
        old = {(r['model'], r['id']): r for r in previous}
        new = {(r['model'], r['id']): r for r in records}
        # Include trigger, binding, dependency and related changes as well as source.
        stable = lambda r: {k:v for k,v in r.items() if k != 'write_date'}
        summary['added'] = [list(k) for k in new.keys()-old.keys()]
        summary['removed'] = [list(k) for k in old.keys()-new.keys()]
        summary['modified'] = [list(k) for k in old.keys() & new.keys() if stable(old[k]) != stable(new[k])]
        prior_total = sum(r['estimated_cloc'] or 0 for r in previous)
        summary['delta_lines'] = total-prior_total
        summary['delta_blocks'] = math.ceil(total/100)-math.ceil(prior_total/100)
        summary['delta_monthly_estimated'] = args.block_rate*summary['delta_blocks']
    (out/'summary.json').write_text(json.dumps(summary, indent=2))
    print(json.dumps(summary, indent=2))

if __name__ == '__main__':
    main()
