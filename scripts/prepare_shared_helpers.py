"""Build an OFFLINE prototype sharing identical server-action helpers.

This does not connect to Odoo or install anything. The registry is itself
billable Python and is included in projected counts. Callable values returned
between server actions require live safe_eval, access and performance testing.
"""
import argparse
import ast
from collections import defaultdict
import hashlib
import json
from pathlib import Path


def count(source):
    tree = ast.parse(source.strip() + '\n')
    return len({node.lineno for node in ast.walk(tree) if hasattr(node, 'lineno')})


def digest(source):
    return hashlib.sha256(source.encode()).hexdigest()


def prepare(rows):
    # Never move code out of a retired action into the shared registry.
    active = [row for row in rows if row['model'] == 'ir.actions.server'
              and row['eligible'] and row['automation_active'] != 'f']
    occurrences = defaultdict(list)
    variants = defaultdict(set)
    for row in active:
        if any(isinstance(node, ast.Name) and node.id == '_mnl_helpers'
               for node in ast.walk(ast.parse(row['source']))):
            raise ValueError('Reserved helper binding already exists')
        for node in ast.parse(row['source']).body:
            if isinstance(node, ast.FunctionDef):
                shape = ast.dump(node, include_attributes=False)
                variants[node.name].add(shape)
                occurrences[shape].append((row, node))
    groups = {}
    for shape, members in occurrences.items():
        first, node = members[0]
        # Avoid ambiguous global names, definition side effects and tiny helpers.
        if len(members) < 2 or len(variants[node.name]) != 1:
            continue
        defaults = list(node.args.defaults) + [value for value in node.args.kw_defaults if value is not None]
        if node.decorator_list or any(not isinstance(value, ast.Constant) for value in defaults):
            continue
        if node.returns or any(arg.annotation for arg in ast.walk(node.args) if isinstance(arg, ast.arg)):
            continue
        fragment = '\n'.join(first['source'].splitlines()[node.lineno-1:node.end_lineno])
        if count(fragment) < 5:
            continue
        groups[node.name] = {'shape': shape, 'source': fragment, 'members': members}
    library = '\n\n'.join(group['source'] for group in groups.values())
    library += '\n\naction = {"helpers": {' + ', '.join(repr(name) + ': ' + name for name in groups) + '}}\n'
    loader = ("_mnl_helpers = env.ref('mnl.optimization_helpers').with_context(\n"
              "    active_model='sale.order', active_id=False, active_ids=[], onchange_self=False).run()['helpers']\n")
    changes = []
    originals = {row['id']: row for row in active}
    for row in active:
        replacements = []
        for node in ast.parse(row['source']).body:
            if isinstance(node, ast.FunctionDef) and node.name in groups:
                if ast.dump(node, include_attributes=False) != groups[node.name]['shape']:
                    raise ValueError('Helper AST mismatch')
                replacements.append((node.lineno-1, node.end_lineno,
                                     node.name + " = _mnl_helpers[" + repr(node.name) + "]"))
        if not replacements:
            continue
        lines = row['source'].splitlines()
        for start, end, replacement in reversed(replacements):
            lines[start:end] = [replacement]
        source = loader + '\n'.join(lines) + '\n'
        compile(source, '<candidate>', 'exec')
        # Apart from replacing top-level helper definitions, executable logic is unchanged.
        original_body = [node for node in ast.parse(row['source']).body
                         if not isinstance(node, ast.FunctionDef) or node.name not in groups]
        candidate_body = ast.parse(source).body[1:]
        candidate_body = [node for node in candidate_body if not (
            isinstance(node, ast.Assign) and isinstance(node.value, ast.Subscript)
            and isinstance(node.value.value, ast.Name) and node.value.value.id == '_mnl_helpers')]
        if ast.dump(ast.Module(body=original_body, type_ignores=[]), include_attributes=False) != ast.dump(ast.Module(body=candidate_body, type_ignores=[]), include_attributes=False):
            raise ValueError('Executable body changed')
        changes.append({'model': row['model'], 'id': row['id'], 'name': row['name'],
                        'original_sha256': digest(row['source']), 'original': row['source'],
                        'candidate': source, 'before': count(row['source']), 'after': count(source)})
    original_total = sum(row['estimated_cloc'] or 0 for row in rows)
    projected = original_total - sum(change['before']-change['after'] for change in changes) + count(library)
    return {'status': 'OFFLINE_PROTOTYPE_NOT_INSTALLED', 'original_total': original_total,
            'projected_total': projected, 'registry_lines': count(library),
            'shared_helpers': {name: {'copies':len(group['members']), 'lines':count(group['source'])}
                               for name, group in groups.items()},
            'registry_xml_id': 'mnl.optimization_helpers', 'registry_model': 'sale.order',
            'registry_code': library, 'changes': changes,
            'required_live_checks': ['safe_eval permits callable dictionary return in installed Enterprise build',
              'same user, record rules and company context; no additional sudo',
              'pseudo-record identity and onchange_self behavior',
              'save/API/import/delete behavior and all functional regressions',
              'latency benchmark; one registry load per action execution',
              'official Count LoC includes registry and every caller',
              'restore original callers before retiring the registry']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('inventory')
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    rows = json.loads(Path(args.inventory).read_text())
    plan = prepare(rows)
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=False)
    (output/'proposal.json').write_text(json.dumps(plan, ensure_ascii=False, indent=2))
    (output/'registry.py').write_text(plan['registry_code'])
    for change in plan['changes']:
        (output/(change['id']+'-before.py')).write_text(change['original'])
        (output/(change['id']+'-after.py')).write_text(change['candidate'])
    print(json.dumps({key:plan[key] for key in ['status','original_total','projected_total','registry_lines','shared_helpers']}, indent=2))


if __name__ == '__main__':
    main()
