import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { requireConfig } from '../src/config.js';
import { OdooClient } from '../src/odooClient.js';
const c=requireConfig();c.url=new URL(c.url).origin;
if(!process.env.ODOO_ENV_FILE||!/^provesmnl\d+$/.test(c.database))throw new Error('Només proves amb configuració explícita.');
const orderId=Number(process.argv[2]);if(!Number.isSafeInteger(orderId)||orderId<=0)throw new Error('Indica un pressupost existent per generar-ne la previsualització.');
const cl=new OdooClient({...c,fetchImpl:(u,o)=>fetch(u,{...o,signal:AbortSignal.timeout(120000)})});await cl.authenticate();
const model=process.env.MNL_PREVIEW_MODEL||'sale.order';
if(!['sale.order','account.move','purchase.order'].includes(model))throw new Error('Model de document no admès.');
const [m]=await cl.searchRead('ir.model',[['model','=',model]],['id']);
const report=process.env.MNL_PREVIEW_REPORT||'mnl_solutions.report_quotation_standard';
const output=resolve(process.env.MNL_PREVIEW_OUTPUT||'outputs/quotation-preview');mkdirSync(output,{recursive:true});
let actionId;let attachmentIds=[];
try{
 const code=`report = env['ir.actions.report']\npdf, kind = report._render_qweb_pdf(${JSON.stringify(report)}, res_ids=[${orderId}])\nhtml, kind = report._render_qweb_html(${JSON.stringify(report)}, [${orderId}])\np = env['ir.attachment'].create({'name':'MNL_QA.pdf','type':'binary','raw':pdf,'mimetype':'application/pdf'})\nh = env['ir.attachment'].create({'name':'MNL_QA.html','type':'binary','raw':html,'mimetype':'text/html'})\naction = {'type':'ir.actions.act_window_close','mnl_attachment_ids':[p.id,h.id]}\n`;
 actionId=await cl.create('ir.actions.server',{name:'MNL QA temporal - render pressupost',model_id:m.id,state:'code',code});
 const r=await cl.call('ir.actions.server','run',[[actionId]]);attachmentIds=r.mnl_attachment_ids;
 for(const a of await cl.searchRead('ir.attachment',[['id','in',attachmentIds]],['name','raw']))writeFileSync(resolve(output,a.name),Buffer.from(a.raw,'base64'));
 console.log(JSON.stringify({database:c.database,model,orderId,report,output,pdf:resolve(output,'MNL_QA.pdf'),html:resolve(output,'MNL_QA.html')}));
}finally{
 if(attachmentIds.length)await cl.unlink('ir.attachment',attachmentIds);
 if(actionId)await cl.unlink('ir.actions.server',[actionId]);
}
