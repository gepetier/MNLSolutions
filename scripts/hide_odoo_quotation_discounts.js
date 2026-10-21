import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { requireConfig } from '../src/config.js';
import { OdooClient } from '../src/odooClient.js';
const c=requireConfig(); c.url=new URL(c.url).origin;
if(!process.env.ODOO_ENV_FILE || !/^provesmnl\d+$/.test(c.database)) throw new Error('Selecciona explicitament una base de proves.');
const cl=new OdooClient({...c,fetchImpl:(u,o)=>fetch(u,{...o,signal:AbortSignal.timeout(45000)})});
const name='MNL - descomptes ajornats: ocultar controls';
await cl.authenticate();
if(process.argv.includes('--rollback')){
  const b=JSON.parse(readFileSync(process.argv[process.argv.indexOf('--rollback')+1],'utf8'));
  if(b.database!==c.database) throw new Error('Base incorrecta.');
  if(b.oldView){const {id,...v}=b.oldView; await cl.write('ir.ui.view',[id],v);}
  else if(b.createdViewId) await cl.write('ir.ui.view',[b.createdViewId],{active:false});
  for(const a of b.boundActions) await cl.write('ir.actions.server',[a.id],{binding_model_id:a.binding_model_id[0],binding_type:a.binding_type});
  console.log(JSON.stringify({database:c.database,rolledBack:true}));process.exit(0);
}
const form=await cl.call('sale.order','get_view',[],{view_type:'form'});
const [base]=await cl.searchRead('ir.model.data',[['module','=','sale'],['name','=','view_order_form']],['res_id']);
const [model]=await cl.searchRead('ir.model',[['model','=','sale.order']],['id']);
const [oldView]=await cl.searchRead('ir.ui.view',[['name','=',name]],['name','model','inherit_id','arch_db','active','priority'],{context:{active_test:false}});
const actions=await cl.searchRead('ir.actions.server',[['binding_model_id','=',model.id]],['name','binding_model_id','binding_type']);
const boundActions=actions.filter(a=>/discount|descomp|descuent/i.test(a.name));
const py=`import sys,json,xml.etree.ElementTree as E
root=E.fromstring(sys.stdin.read());patch=E.Element('data');counts={};targets=[]
parents={c:p for p in root.iter() for c in p}
def ancestor_list(n):
 while n in parents:
  n=parents[n]
  if n.tag=='list':return True
 return False
for n in root.iter():
 name=n.get('name','');trigger=n.get('t-if','');ref=n.get('for','')
 select=False;attrs={}
 if n.tag=='field' and any(w in name.lower() for w in ['discount','descomp']):
  select=True;attrs={'invisible':'1'}
  if ancestor_list(n):attrs['column_invisible']='1'
 elif n.tag=='label' and any(w in ref.lower() for w in ['discount','descomp']):select=True;attrs={'invisible':'1'}
 elif n.tag=='div' and name=='discount':select=True;attrs={'invisible':'1'}
 elif n.tag=='group' and name=='mnl_fixed_discount':select=True;attrs={'invisible':'1'}
 elif n.tag=='button' and name=='action_open_discount_wizard':select=True;attrs={'invisible':'1'}
 elif n.tag=='t' and 'discount' in trigger:select=True;attrs={'t-if':'False'}
 if not select:continue
 key='name' if name else 'for' if ref else 't-if';value=n.get(key)
 signature=(n.tag,key,value);counts[signature]=counts.get(signature,0)+1
 expr='(//%s[@%s=%s])[%d]'%(n.tag,key,repr(value),counts[signature])
 x=E.SubElement(patch,'xpath',{'expr':expr,'position':'attributes'})
 for k,v in attrs.items():E.SubElement(x,'attribute',{'name':k}).text=v
 targets.append({'tag':n.tag,'reference':name or ref or trigger,'attributes':attrs})
print(json.dumps({'xml':E.tostring(patch,encoding='unicode'),'targets':targets}))`;
const generated=spawnSync(process.env.PYTHON || 'python3',['-c',py],{input:form.arch,encoding:'utf8'});
if(generated.status!==0) throw new Error(generated.stderr);
const patch=JSON.parse(generated.stdout);
if(oldView) patch.xml=oldView.arch_db; // Preserve selectors for already-hidden kanban templates on reapply.
if(!patch.targets.length) throw new Error('No hi ha controls de descompte per ocultar.');
if(!process.argv.includes('--apply')) { console.log(JSON.stringify({database:c.database,mode:'preview',targets:patch.targets,boundActions:boundActions.map(a=>({id:a.id,name:a.name}))},null,2));process.exit(0); }
mkdirSync('logs',{recursive:true});
const path=resolve('logs',`odoo-hide-discounts-${c.database}-${Date.now()}.json`);
const backup={database:c.database,oldView:oldView||null,boundActions,targets:patch.targets,createdViewId:null};
const save=()=>writeFileSync(path,JSON.stringify(backup,null,2));save();
const values={name,model:'sale.order',inherit_id:base.res_id,priority:1000,active:true,arch_db:patch.xml};
if(oldView) await cl.write('ir.ui.view',[oldView.id],values);
else {backup.createdViewId=await cl.create('ir.ui.view',values);save();}
for(const a of boundActions) await cl.write('ir.actions.server',[a.id],{binding_model_id:false});
const after=await cl.call('sale.order','get_view',[],{view_type:'form'});
const verify=`import sys,json,xml.etree.ElementTree as E
r=E.fromstring(sys.stdin.read());parents={c:p for p in r.iter() for c in p};bad=[]
def hidden(n):
 while n is not None:
  if n.get('invisible') in ['1','True','true'] or n.get('column_invisible') in ['1','True','true'] or n.get('t-if')=='False':return True
  n=parents.get(n)
 return False
for n in r.iter():
 ref=' '.join(n.get(k,'') for k in ['name','string','for','t-if'])
 if n.tag in ['field','label','div','group','button','t'] and any(w in ref.lower() for w in ['discount','descomp','descuent']) and not hidden(n):bad.append({'tag':n.tag,'reference':ref})
print(json.dumps({'visibleDiscountReferences':bad}))`;
const result=spawnSync(process.env.PYTHON||'python3',['-c',verify],{input:after.arch,encoding:'utf8'});
if(result.status!==0) throw new Error(result.stderr);
const verified=JSON.parse(result.stdout);
if(verified.visibleDiscountReferences.length) throw new Error(JSON.stringify(verified));
console.log(JSON.stringify({database:c.database,applied:true,viewId:oldView?.id||backup.createdViewId,hiddenNodes:patch.targets.length,hiddenContextActions:boundActions.length,verification:verified,backup:path}));
