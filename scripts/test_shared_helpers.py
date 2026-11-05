"""Local differential checks against a private offline prototype.

These exercise Python behavior with representative records, NOT Odoo ORM,
permissions, transactions, safe_eval or browser integration.
Usage: python3 scripts/test_shared_helpers.py /private/proposal.json
"""
import ast
import copy
import datetime
import json
import sys
from types import SimpleNamespace


class Row(SimpleNamespace):
    def __getitem__(self, key):
        return getattr(self, key)


class Rows(list):
    def sorted(self, key):
        return Rows(sorted(self, key=key))


class Parameter:
    def sudo(self):
        return self

    def get_param(self, name):
        return True

    def precision_get(self, name):
        return 2


class Env:
    def __init__(self, registry):
        self.context = {}
        self.registry = registry
        self.loads = 0

    def __getitem__(self, name):
        return Parameter()

    def ref(self, name):
        assert name == 'mnl.optimization_helpers'
        return self

    def with_context(self, **kwargs):
        assert kwargs == dict(active_model='sale.order', active_id=False,
                              active_ids=[], onchange_self=False)
        return self

    def run(self):
        self.loads += 1
        context = dict(env=self, datetime=datetime, UserError=ValueError)
        exec(compile(self.registry, '<mock registry>', 'exec'), context)
        return context['action']


def line(kind='m2', units=6, length=2.0, width=1.5, percent=20.0):
    product = Row(id=10, name='Panell', default_code='PANEL', lst_price=100,
                  product_tmpl_id=Row(x_studio_tipus_calcul=kind))
    order = Row(state='draft', x_studio_descompte_global=20,
                x_studio_mostrar_descomptes=True)
    result = Row(id=50, display_type=False, product_id=product, is_downpayment=False,
                 x_mnl_is_portes=False, x_studio_uds=units, x_studio_long=length,
                 x_studio_ancho_1=width, product_uom_qty=1.0, discount=0,
                 x_mnl_discount_individual=10, order_id=order, price_unit=100,
                 _fields={'x_mnl_profit_nominal':True}, x_mnl_profit_initialized=False,
                 x_mnl_profit_nominal=0, x_mnl_profit_percent=percent,
                 x_mnl_profit_last_nominal=0, x_mnl_profit_last_percent=0,
                 x_mnl_profit_mode='percent', x_mnl_profit_base_price=100,
                 x_mnl_profit_last_base=0, x_mnl_profit_last_final=0,
                 x_mnl_profit_product=10, x_mnl_profit_percent_target=percent,
                 _origin=Row(id=False))
    order.order_line = Rows([result])
    return result


def execute(source, record, registry):
    env = Env(registry)
    namespace = dict(env=env, record=record, records=Rows([record]),
                     datetime=datetime, UserError=ValueError)
    exec(compile(source, '<mock action>', 'exec'), namespace)
    return namespace, env.loads


def run(plan):
    changes = {change['id']:change for change in plan['changes']}
    ui = changes['808']
    registry = plan['registry_code']
    checks = 0
    for kind, units, length, width, expected in [
        ('m2',6,2,1.5,18), ('ml',6,2,0,12), ('uds',6,0,0,6),
        ('m2',6,0,1.5,0), ('ml',0,2,0,0), ('m2',2,0.03,0.04,0.0024),
    ]:
        sample = line(kind,units,length,width)
        before,_ = execute(ui['original'],copy.deepcopy(sample),registry)
        after,loads = execute(ui['candidate'],copy.deepcopy(sample),registry)
        assert before['action'] == after['action']
        assert abs(after['action']['value']['product_uom_qty']-expected) < 1e-9
        assert after['action']['value']['price_unit'] == 120
        assert abs(after['action']['value']['discount']-28) < 1e-9
        assert loads == 1
        checks += 1
    # Rejection must be preserved, including its message.
    sample=line(percent=-1)
    failures=[]
    for source in [ui['original'],ui['candidate']]:
        try:
            execute(source,copy.deepcopy(sample),registry)
        except ValueError as error:
            failures.append(str(error))
    assert len(failures)==2 and failures[0]==failures[1]
    checks += 1
    # Compare the original validity helpers with the shared version on real dates.
    validity=changes['868']
    funcs=[node for node in ast.parse(validity['original']).body if isinstance(node,ast.FunctionDef)]
    original={ 'env':Env(registry), 'datetime':datetime, 'UserError':ValueError }
    exec(compile(ast.Module(body=funcs,type_ignores=[]),'<original helpers>','exec'),original)
    shared=Env(registry).run()['helpers']
    # Fixed/hourly transport including zones, crane, combined trips and vehicle.
    pricing_source=changes['825']['original']
    pricing_funcs=[node for node in ast.parse(pricing_source).body if isinstance(node,ast.FunctionDef)]
    pricing=dict(env=Env(registry),datetime=datetime,UserError=ValueError)
    exec(compile(ast.Module(body=pricing_funcs,type_ignores=[]),'<original pricing>','exec'),pricing)
    for fixed,zone,crane,combined,vehicle in [
        (True,'catalonia',False,False,'van'),(True,'spain',True,False,'rigid'),
        (False,'other',True,True,'trailer'),(False,'catalonia',False,False,'van'),
        (False,'spain',False,True,'rigid'),(False,'other',True,False,'trailer')]:
        provider=Row(x_zone_spain_surcharge=20,x_zone_other_surcharge=40,
            x_zone_catalonia_surcharge=0,x_pricing_mode='fixed' if fixed else 'hourly',
            x_fixed_cost=80,x_min_hours=3,x_hourly_rate=30,x_combined_surcharge=5,
            x_crane_surcharge=10,x_trailer_surcharge=8,x_rigid_surcharge=4,x_van_surcharge=0,
            x_customer_pricing_mode='markup',x_customer_fixed_price=100,x_customer_markup_pct=20)
        sample=Row(x_mnl_transport_provider_id=provider,x_mnl_portes=True,
            x_mnl_portes_zone=zone,x_mnl_portes_hours=1,x_mnl_portes_combined=combined,
            x_mnl_portes_crane=crane,x_mnl_portes_vehicle=vehicle)
        assert pricing['mnl_transport'](sample)==shared['mnl_transport'](sample)
        checks += 1
    category=Row(id=3,name='Façana')
    items=Rows([Row(id=1,sequence=10,display_type=False,product_id=Row(id=7,categ_id=category)),
                Row(id=2,sequence=20,display_type=False,product_id=Row(id=8,categ_id=category)),
                Row(id=3,sequence=30,display_type=False,product_id=Row(id=7,categ_id=category))])
    order=Row(order_line=items)
    classified=shared['mnl_classifiers'](order)
    assert classified==pricing['mnl_classifiers'](order)
    assert classified[1]['x_studio_classificador']==classified[3]['x_studio_classificador']=='1.01'
    assert classified[2]['x_studio_classificador']=='1.02'
    checks += 1
    for text,source in [('Oferta vàlida durant 30 dies.','text'),
                        ('Oferta válida hasta el 05/12/2026.','text'),
                        ('Offer valid until 2026-12-05.','text'),
                        ('Condicions manuals.','date')]:
        sample=Row(x_studio_condicions_acceptacio=text,
                   validity_date=datetime.date(2026,12,5),
                   date_order=datetime.datetime(2026,11,5,10),
                   x_studio_validesa_dies=30,x_studio_idioma_document='ca_ES')
        expected=original['mnl_validity_values'](copy.deepcopy(sample),source)
        actual=shared['mnl_validity_values'](copy.deepcopy(sample),source)
        assert expected==actual
        checks += 1
    print(json.dumps({'differential_cases_passed':checks,'odoo_integration_tested':False,
                      'projected_lines':plan['projected_total']}))


if __name__ == '__main__':
    run(json.load(open(sys.argv[1])))
