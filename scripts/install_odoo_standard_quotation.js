import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { requireConfig } from '../src/config.js';
import { OdooClient } from '../src/odooClient.js';
const c=requireConfig();c.url=new URL(c.url).origin;
if(!process.env.ODOO_ENV_FILE||!/^provesmnl\d+$/.test(c.database))throw new Error('Cal seleccionar explicitament proves.');
const cl=new OdooClient({...c,fetchImpl:(u,o)=>fetch(u,{...o,signal:AbortSignal.timeout(120000)})});
await cl.authenticate();
const docKey='mnl_solutions.report_quotation_standard_document';
const reportKey='mnl_solutions.report_quotation_standard';
const defaultName='MNL - pressupost estàndard predeterminat';
const paperName='MNL Pressupost A4 vertical';
async function rows(m,d,f){return cl.searchRead(m,d,f,{context:{active_test:false},limit:100});}
if(process.argv.includes('--rollback')){
 const b=JSON.parse(readFileSync(process.argv[process.argv.indexOf('--rollback')+1],'utf8'));
 if(b.database!==c.database)throw new Error('Backup d’una altra base.');
 for(const v of b.views){const{id,...values}=v;values.inherit_id=values.inherit_id?.[0]||false;await cl.write('ir.ui.view',[id],values);}
 for(const id of b.createdViews)await cl.write('ir.ui.view',[id],{active:false});
 for(const r of b.reports){const{id,...values}=r;for(const k of ['binding_model_id','paperformat_id'])values[k]=values[k]?.[0]||false;await cl.write('ir.actions.report',[id],values);}
 if(b.createdReport)await cl.write('ir.actions.report',[b.createdReport],{binding_model_id:false});
 console.log(JSON.stringify({rolledBack:true,database:c.database}));process.exit(0);
}
const [baseRef]=await rows('ir.model.data',[['module','=','sale'],['name','=','report_saleorder_document']],['res_id']);
const [model]=await rows('ir.model',[['model','=','sale.order']],['id']);
const views=await rows('ir.ui.view',['|',['key','in',[docKey,reportKey]],['name','=',defaultName]],['name','type','key','arch_db','inherit_id','active','priority']);
const reports=await rows('ir.actions.report',[['model','=','sale.order']],['name','report_name','report_file','report_type','binding_model_id','binding_type','paperformat_id','print_report_name']);
const [oldPaper]=await rows('report.paperformat',[['name','=',paperName]],['id']);
const source=readFileSync(new URL('../templates/quotation_standard.xml',import.meta.url),'utf8');
if(/x_mnl_profit|x_studio_marge|purchase_price|description_sale/.test(source))throw new Error('La plantilla exposa dades internes o descripcions.');
if(!process.argv.includes('--apply')){console.log(JSON.stringify({database:c.database,mode:'preview',columns:['Class.','Article','Unitats','Longitud','Amplada','Quantitat','Total quantitat','Ud.','Unitat','Preu unitari final','Import sense IVA','Import amb IVA'],paper:'A4 Portrait',activation:process.argv.includes('--activate')}));process.exit(0);}
mkdirSync('logs',{recursive:true});const backupPath=resolve('logs',`odoo-standard-quotation-${c.database}-${Date.now()}.json`);
const b={database:c.database,views,reports,createdViews:[],createdReport:null,createdPaper:null};const save=()=>writeFileSync(backupPath,JSON.stringify(b,null,2));save();
let paperId=oldPaper?.id;if(!paperId){paperId=await cl.create('report.paperformat',{name:paperName,default:false,format:'A4',orientation:'Portrait',margin_top:10,margin_bottom:14,margin_left:8,margin_right:8,header_line:false,header_spacing:4,dpi:90});b.createdPaper=paperId;save();}
async function upsert(key,name,arch,inherit=false){const old=views.find(v=>key?v.key===key:v.name===name);const val={name,type:'qweb',key:key||old?.key||'mnl_solutions.report_quotation_standard_default',arch_db:arch,inherit_id:inherit,active:true,priority:1000};if(old){await cl.write('ir.ui.view',[old.id],val);return old.id;}const id=await cl.create('ir.ui.view',val);b.createdViews.push(id);save();return id;}
await upsert(docKey,'MNL Pressupost estàndard - document',source);
await upsert(reportKey,'MNL Pressupost estàndard - informe',`<t t-name="${reportKey}"><t t-call="web.html_container"><t t-foreach="docs" t-as="doc"><t t-call="${docKey}"/></t></t></t>`);
const existing=reports.find(r=>r.report_name===reportKey);
const reportValues={name:'Pressupost MNL',model:'sale.order',report_name:reportKey,report_file:reportKey,report_type:'qweb-pdf',paperformat_id:paperId,print_report_name:"'Pressupost - %s' % object.name",binding_type:'report',binding_model_id:process.argv.includes('--activate')?model.id:false};
const reportId=existing?.id||await cl.create('ir.actions.report',reportValues);if(existing)await cl.write('ir.actions.report',[existing.id],reportValues);else{b.createdReport=reportId;save();}
if(process.argv.includes('--activate')){
 const override=`<data><xpath expr="//t[@t-call='web.external_layout']" position="before"><t t-if="doc.state in ['draft','sent'] and not is_proforma"><t t-call="${docKey}"/></t></xpath><xpath expr="//t[@t-call='web.external_layout']" position="attributes"><attribute name="t-if">doc.state not in ['draft','sent'] or is_proforma</attribute></xpath></data>`;
 await upsert(false,defaultName,override,baseRef.res_id);
 for(const r of reports){
  if(/^mnl_solutions\.report_saleorder_style_/.test(r.report_name))await cl.write('ir.actions.report',[r.id],{binding_model_id:false});
  else if(['sale.report_saleorder','sale.report_saleorder_raw'].includes(r.report_name))await cl.write('ir.actions.report',[r.id],{binding_model_id:false,paperformat_id:paperId,print_report_name:"(object.state in ('draft','sent') and 'Pressupost - %s' % object.name) or 'Comanda - %s' % object.name"});
 }
}
console.log(JSON.stringify({database:c.database,installed:true,default:process.argv.includes('--activate'),reportId,paperId,reportKey,backupPath}));
