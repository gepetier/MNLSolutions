import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { requireConfig } from '../src/config.js';
import { OdooClient } from '../src/odooClient.js';
const c=requireConfig();c.url=new URL(c.url).origin;
if(!process.env.ODOO_ENV_FILE||!/^provesmnl\d+$/.test(c.database))throw Error('Selecciona proves explícitament.');
const api=new OdooClient({...c,fetchImpl:(u,o)=>fetch(u,{...o,signal:AbortSignal.timeout(45000)})});
const products=await api.searchRead('product.template',[],['name','default_code','categ_id','active','purchase_ok','seller_ids'],{limit:10000,context:{active_test:false}});
const tests=products.filter(p=>p.active && (/^MNL-QA-.*NO REAL/.test(p.name)||(/^PROVA — /.test(p.name)&&/^MNL-DEMO-/.test(p.default_code||''))));
const panels=products.filter(p=>p.active && /^Panell /.test(p.name) && /(?:Coberta|Façana|Facana)$/.test(p.categ_id?.[1]||''));
assert(panels.length,'No hi ha panells.');
const vendors=await api.searchRead('res.partner',['|',['name','ilike','hurr'],['name','ilike','huur']],['name','active','supplier_rank'],{context:{active_test:false}});
if(vendors.length>1)throw Error('Cal identificar el proveïdor entre els contactes coincidents.');
if(vendors[0]&&!vendors[0].active)throw Error('El proveïdor està arxivat.');
const sellers=await api.searchRead('product.supplierinfo',[['product_tmpl_id','in',panels.map(p=>p.id)]],['partner_id','product_tmpl_id','product_id','sequence','price','min_qty','date_start','date_end','company_id'],{limit:10000});
if(!process.argv.includes('--apply')){console.log(JSON.stringify({preview:true,archive:tests.length,panels:panels.length,createVendor:!vendors.length}));process.exit(0);}
mkdirSync('logs',{recursive:true});const file=`logs/catalog-cleanup-${Date.now()}.json`;
const backup={database:c.database,tests,panels,vendors,sellers,createdSellerIds:[],createdVendorId:null};const save=()=>writeFileSync(file,JSON.stringify(backup,null,2));save();
const vendorId=vendors[0]?.id||await api.create('res.partner',{name:'Hurre',is_company:true,supplier_rank:1});
if(!vendors.length){backup.createdVendorId=vendorId;save();}
const sequence=Math.min(0,...sellers.map(s=>s.sequence))-1;
for(const p of panels){
 const own=sellers.find(s=>s.product_tmpl_id[0]===p.id&&s.partner_id[0]===vendorId&&!s.product_id&&!s.date_start&&!s.date_end&&s.min_qty===0&&!s.company_id);
 if(own)await api.write('product.supplierinfo',[own.id],{sequence});
 else{backup.createdSellerIds.push(await api.create('product.supplierinfo',{partner_id:vendorId,product_tmpl_id:p.id,product_id:false,sequence,min_qty:0,price:0,company_id:false}));save();}
 if(!p.purchase_ok)await api.write('product.template',[p.id],{purchase_ok:true});
}
if(tests.length)await api.write('product.template',tests.map(p=>p.id),{active:false});
const rules=await api.searchRead('product.supplierinfo',[['product_tmpl_id','in',panels.map(p=>p.id)]],['partner_id','product_tmpl_id','product_id','sequence','min_qty','date_start','date_end','company_id'],{limit:10000});
for(const p of panels){const selected=rules.filter(s=>s.product_tmpl_id[0]===p.id).sort((a,b)=>a.sequence-b.sequence)[0];assert.equal(selected.partner_id[0],vendorId);assert.equal(selected.product_id,false);}
const archived=await api.searchRead('product.template',[['id','in',tests.map(p=>p.id)]],['active'],{context:{active_test:false}});assert(archived.every(p=>!p.active));
const variants=await api.call('product.product','search_count',[[['product_tmpl_id','in',panels.map(p=>p.id)]]]);
console.log(JSON.stringify({applied:true,archived:tests.length,panelTemplates:panels.length,panelVariants:variants,vendor:'Hurre',createdVendor:!vendors.length,purchasePrices:'pending; no invented prices',backupFile:file}));process.exit(0);
