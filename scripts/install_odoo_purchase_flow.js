import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {requireConfig} from '../src/config.js';
import {OdooClient} from '../src/odooClient.js';
const cfg=requireConfig();cfg.url=new URL(cfg.url).origin;
if(!process.env.ODOO_ENV_FILE||!/^provesmnl\d+$/.test(cfg.database))throw Error('Selecciona explícitament proves.');
const cl=new OdooClient({...cfg,fetchImpl:(u,o)=>fetch(u,{...o,signal:AbortSignal.timeout(90000)})});
const prefix='MNL - compres des de comanda';
const read=(m,d,f)=>cl.searchRead(m,d,f,{context:{active_test:false},limit:10000});
const fields={
 'sale.order':[['x_mnl_purchase_generated','Compres generades','boolean'],['x_mnl_purchase_order_ids','Esborranys de compra','many2many','purchase.order']],
 'purchase.order':[['x_mnl_source_order_id','Comanda de client d’origen','many2one','sale.order'],['x_mnl_source_ref','Referència acceptada','char'],['x_mnl_source_revision','Revisió acceptada','char']],
 'purchase.order.line':[['x_mnl_source_supplierinfo_id','Tarifa de proveïdor seleccionada','many2one','product.supplierinfo'],['x_mnl_units','Unitats venudes','float'],['x_mnl_length','Longitud (m)','float'],['x_mnl_width','Amplada (m)','float'],['x_mnl_kind','Tipus de càlcul','char']]
};
const models=await read('ir.model',[['model','in',[...Object.keys(fields),'product.template']]],['model']);
const actions=await read('ir.actions.server',[['name','=like',prefix+'%']],['name','model_id','state','code']);
const automations=await read('base.automation',[['name','=like',prefix+'%']],['name','model_id','trigger','active','action_server_ids','trigger_field_ids']);
const views=await read('ir.ui.view',[['name','=like',prefix+'%']],['name','model','inherit_id','arch_db','active','priority']);
const [freeze]=await read('ir.actions.server',[['name','=','MNL - flux acceptació i factura acceptar i protegir comanda']],['code']);
const [parameter]=await read('ir.config_parameter',[['key','=','mnl.purchase_flow_action_id']],['key','value']);
if(process.argv.includes('--rollback')){
 const b=JSON.parse(readFileSync(process.argv[process.argv.indexOf('--rollback')+1],'utf8'));if(b.database!==cfg.database)throw Error('Base incorrecta');
 if(parameter){if(b.parameter)await cl.write('ir.config_parameter',[parameter.id],{value:b.parameter.value});else await cl.unlink('ir.config_parameter',[parameter.id]);}
 await cl.write('ir.actions.server',[b.freeze.id],{code:b.freeze.code});
 for(const id of b.createdAutomations)await cl.write('base.automation',[id],{active:false});
 for(const a of b.automations){const{id,...v}=a;v.model_id=v.model_id[0];for(const k of ['action_server_ids','trigger_field_ids'])v[k]=[[6,0,v[k]]];await cl.write('base.automation',[id],v);}
 for(const a of b.actions){const{id,...v}=a;v.model_id=v.model_id[0];await cl.write('ir.actions.server',[id],v);}
 for(const id of b.createdViews)await cl.write('ir.ui.view',[id],{active:false});
 for(const a of b.views){const{id,...v}=a;v.inherit_id=v.inherit_id?.[0]||false;await cl.write('ir.ui.view',[id],v);}
 console.log(JSON.stringify({rolledBack:true,documentsAndFieldsPreserved:true}));process.exit(0);
}
if(!process.argv.includes('--apply')){console.log(JSON.stringify({database:cfg.database,preview:true,fields,mode:'one draft RFQ per vendor per accepted order; no sending or confirmation'}));process.exit(0);}
if(!freeze)throw Error('Instal·la primer el flux de congelació.');
mkdirSync('logs',{recursive:true});const backupPath=resolve('logs',`odoo-purchase-flow-${cfg.database}-${Date.now()}.json`);const b={database:cfg.database,actions,automations,views,freeze,parameter,createdFields:[],createdAutomations:[],createdViews:[],createdActions:[]};const save=()=>writeFileSync(backupPath,JSON.stringify(b,null,2));save();
const known=await read('ir.model.fields',[['model','in',Object.keys(fields)]],['model','name','ttype']);
for(const [model,defs]of Object.entries(fields))for(const[name,label,type,relation]of defs){const old=known.find(x=>x.model===model&&x.name===name);if(old&&old.ttype!==type)throw Error('Tipus incompatible '+name);if(!old){b.createdFields.push(await cl.create('ir.model.fields',{name,field_description:label,ttype:type,...relation?{relation}:{},model_id:models.find(x=>x.model===model).id,state:'manual',store:true,copied:false,readonly:true}));save();}}
async function action(suffix,model,file){const name=prefix+suffix;const old=actions.find(x=>x.name===name);const v={name,model_id:models.find(x=>x.model===model).id,state:'code',code:readFileSync(new URL('./assets/'+file,import.meta.url),'utf8')};if(old){await cl.write('ir.actions.server',[old.id],v);return old.id;}const id=await cl.create('ir.actions.server',v);b.createdActions.push(id);save();return id;}
const generate=await action(' generar esborranys','sale.order','purchase_flow_generate.py');const guard=await action(' exigir proveïdor en crear producte','product.template','purchase_flow_product_guard.py');
const av={name:prefix+' exigir proveïdor en crear producte',model_id:models.find(x=>x.model==='product.template').id,trigger:'on_create',active:true,action_server_ids:[[6,0,[guard]]]};const old=automations.find(x=>x.name===av.name);if(old)await cl.write('base.automation',[old.id],av);else{b.createdAutomations.push(await cl.create('base.automation',av));save();}
const ref=async(module,name)=>(await read('ir.model.data',[['module','=',module],['name','=',name]],['res_id']))[0].res_id;
async function view(suffix,model,parent,xml){const name=prefix+suffix;const old=views.find(x=>x.name===name);const v={name,model,inherit_id:parent,arch_db:xml,active:true,priority:1600};if(old)await cl.write('ir.ui.view',[old.id],v);else{b.createdViews.push(await cl.create('ir.ui.view',v));save();}}
await view(' comanda','sale.order',await ref('sale','view_order_form'),`<data><xpath expr="//sheet/notebook" position="inside"><page name="mnl_purchase_sources" string="Compres a proveïdors" groups="purchase.group_purchase_user"><field name="x_mnl_purchase_generated" readonly="1"/><field name="x_mnl_purchase_order_ids" readonly="1" nolabel="1"><list create="0" delete="0" edit="0"><field name="name"/><field name="partner_id"/><field name="state"/><field name="amount_total"/><field name="currency_id" column_invisible="1"/></list></field><p>Un esborrany per proveïdor d'aquesta comanda. Revisa les compres abans de confirmar-les o enviar-les.</p></page></xpath></data>`);
await view(' compra','purchase.order',await ref('purchase','purchase_order_form'),`<data><xpath expr="//sheet/notebook" position="before"><group string="Comanda de client d'origen" invisible="not x_mnl_source_order_id"><field name="x_mnl_source_order_id" readonly="1"/><field name="x_mnl_source_ref" readonly="1"/><field name="x_mnl_source_revision" readonly="1"/></group></xpath><xpath expr="//field[@name='order_line']/list/field[@name='product_qty']" position="before"><field name="x_mnl_units" optional="show" readonly="1" column_invisible="not parent.x_mnl_source_order_id"/><field name="x_mnl_length" optional="show" readonly="1" column_invisible="not parent.x_mnl_source_order_id"/><field name="x_mnl_width" optional="show" readonly="1" column_invisible="not parent.x_mnl_source_order_id"/></xpath></data>`);
await view(' producte','product.template',await ref('product','product_template_only_form_view'),`<data><xpath expr="//sheet/notebook" position="before"><div class="alert alert-info" invisible="not sale_ok">Els productes de venda nous necessiten «Es pot comprar» i almenys un proveïdor a la pestanya Compra. La confirmació comprova la tarifa aplicable a cada variant, quantitat i data.</div></xpath></data>`);
// Activate last: existing quotations are not confirmed or backfilled.
await cl.write('ir.actions.server',[freeze.id],{code:readFileSync(new URL('./assets/sales_flow_order.py',import.meta.url),'utf8')});
if(parameter)await cl.write('ir.config_parameter',[parameter.id],{value:String(generate)});else await cl.create('ir.config_parameter',{key:'mnl.purchase_flow_action_id',value:String(generate)});
console.log(JSON.stringify({database:cfg.database,applied:true,backupPath,newFields:b.createdFields.length,purchasesConfirmed:0,purchasesSent:0}));process.exit(0);
