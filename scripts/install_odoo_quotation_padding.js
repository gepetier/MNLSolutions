import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { requireConfig } from '../src/config.js';
import { OdooClient } from '../src/odooClient.js';
const c=requireConfig(); c.url=new URL(c.url).origin;
if(!process.env.ODOO_ENV_FILE || !/^provesmnl\d+$/.test(c.database)) throw Error('Selecciona proves explícitament.');
const api=new OdooClient({...c,fetchImpl:(u,o)=>fetch(u,{...o,signal:AbortSignal.timeout(30000)})});
const files={'mnl_solutions.report_quotation_standard_document':'quotation_standard.xml','mnl_solutions.report_quotation_v3_document':'quotation_v3.xml'};
const views=await api.searchRead('ir.ui.view',[['key','in',Object.keys(files)]],['key','arch_db']);
if(!views.some(v=>v.key==='mnl_solutions.report_quotation_standard_document')) throw Error('Falta la plantilla predeterminada.');
if(!process.argv.includes('--apply')){console.log(JSON.stringify({preview:true,templates:views.length}));process.exit(0);}
mkdirSync('logs',{recursive:true});writeFileSync(`logs/quotation-padding-${Date.now()}.json`,JSON.stringify({database:c.database,views},null,2));
for(const v of views) await api.write('ir.ui.view',[v.id],{arch_db:readFileSync(new URL('../templates/'+files[v.key],import.meta.url),'utf8')});
console.log(JSON.stringify({applied:true,templates:views.length,businessRecordsChanged:0}));process.exit(0);
