import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { requireConfig } from '../src/config.js';
import { OdooClient } from '../src/odooClient.js';
const cfg=requireConfig();cfg.url=new URL(cfg.url).origin;
if(!process.env.ODOO_ENV_FILE||!/^provesmnl\d+$/.test(cfg.database))throw new Error('Selecciona explícitament proves.');
const cl=new OdooClient({...cfg,fetchImpl:(u,o)=>fetch(u,{...o,signal:AbortSignal.timeout(45000)})});
const prefix='MNL - sincronitzar validesa';
const read=(m,d,f)=>cl.searchRead(m,d,f,{context:{active_test:false},limit:200});
if(process.argv.includes('--rollback')){
 const b=JSON.parse(readFileSync(process.argv[process.argv.indexOf('--rollback')+1],'utf8'));
 if(b.database!==cfg.database)throw new Error('Backup d’una altra base.');
 for(const id of b.createdAutomations)await cl.write('base.automation',[id],{active:false});
 for(const a of b.automations){const{id,...v}=a;v.model_id=v.model_id[0];for(const k of ['on_change_field_ids','trigger_field_ids','action_server_ids'])v[k]=[[6,0,v[k]]];await cl.write('base.automation',[id],v);}
 for(const a of b.actions){const{id,...v}=a;v.model_id=v.model_id[0];await cl.write('ir.actions.server',[id],v);}
 console.log(JSON.stringify({rolledBack:true,database:cfg.database}));process.exit(0);
}
const [model]=await read('ir.model',[['model','=','sale.order']],['id']);
const fields=await read('ir.model.fields',[['model','=','sale.order'],['name','in',['validity_date','date_order','x_studio_condicions_acceptacio']]],['name']);
if(fields.length!==3)throw new Error('Falten camps de validesa.');
const names=[' UI data',' UI text',' persistència'].map(s=>prefix+s);
const actions=await read('ir.actions.server',['|',['name','in',names],['code','ilike','def mnl_acceptance(order):']],['name','model_id','state','code']);
const automations=await read('base.automation',[['name','in',names]],['name','model_id','active','trigger','on_change_field_ids','trigger_field_ids','action_server_ids']);
const helper=readFileSync(new URL('./assets/quotation_validity.py',import.meta.url),'utf8');
const codeFor=source=>helper+`\nvalues = {}\nfor order in (record and [record]) or records or []:\n    if order.state in ['draft','sent'] and not env.context.get('mnl_validity_sync_skip'):\n        supplied = env.context.get('old_values')\n        supplied = supplied.get(order.id, {}) if supplied is not None else None\n        previous_text = order._origin.x_studio_condicions_acceptacio or ''\n        updates = mnl_validity_values(order, '${source}', supplied, previous_text)\n        ${source==='auto'?"if updates:\n            order.with_context(mnl_validity_sync_skip=True, mnl_refresh_skip=True).write(updates)":"values.update(updates)"}\naction = ${source==='auto'?"{'type':'ir.actions.act_window_close'}":"{'value':values}"}\n`;
if(!process.argv.includes('--apply')){console.log(JSON.stringify({database:cfg.database,mode:'preview',rules:names,legacyAcceptanceActions:actions.filter(a=>a.code.includes('def mnl_acceptance(order):')).map(a=>a.id),bidirectional:true,preserveOtherText:true}));process.exit(0);}
mkdirSync('logs',{recursive:true});const backupPath=resolve('logs',`odoo-quotation-validity-${cfg.database}-${Date.now()}.json`);
const b={database:cfg.database,actions,automations,createdActions:[],createdAutomations:[]};const save=()=>writeFileSync(backupPath,JSON.stringify(b,null,2));save();
for(const a of actions.filter(a=>a.code.includes('def mnl_acceptance(order):'))){
 if(a.code.includes('# Bidirectional validity rules own this text;'))continue;
 const code=a.code.replace(/def mnl_acceptance\(order\):\n[\s\S]*?(?=\ndef )/,"def mnl_acceptance(order):\n    # Bidirectional validity rules own this text; never overwrite manual edits.\n    return order.x_studio_condicions_acceptacio or ''\n");
 if(code===a.code)throw new Error(`No es pot aïllar la funció antiga a l’acció ${a.id}.`);
 await cl.write('ir.actions.server',[a.id],{code});
}
for(const [suffix,source,watched]of [[' UI data','date',['validity_date','date_order']],[' UI text','text',['x_studio_condicions_acceptacio']],[' persistència','auto',['validity_date','date_order','x_studio_condicions_acceptacio']]]){
 const name=prefix+suffix;const old=actions.find(a=>a.name===name);const av={name,model_id:model.id,state:'code',code:codeFor(source)};
 const id=old?.id||await cl.create('ir.actions.server',av);if(old)await cl.write('ir.actions.server',[id],av);else{b.createdActions.push(id);save();}
 const trigger=source==='auto'?'on_create_or_write':'on_change';const fieldIds=fields.filter(f=>watched.includes(f.name)).map(f=>f.id);
 const values={name,model_id:model.id,active:true,trigger,trigger_field_ids:[[6,0,fieldIds]],action_server_ids:[[6,0,[id]]]};
 if(trigger==='on_change')values.on_change_field_ids=[[6,0,fieldIds]];
 const existing=automations.find(a=>a.name===name);if(existing)await cl.write('base.automation',[existing.id],values);else{b.createdAutomations.push(await cl.create('base.automation',values));save();}
}
console.log(JSON.stringify({database:cfg.database,applied:true,backupPath,automations:b.createdAutomations}));process.exit(0);
