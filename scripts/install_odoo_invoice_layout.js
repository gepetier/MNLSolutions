import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { requireConfig } from '../src/config.js';
import { OdooClient } from '../src/odooClient.js';
const cfg = requireConfig(); cfg.url = new URL(cfg.url).origin;
if (!process.env.ODOO_ENV_FILE || !/^provesmnl\d+$/.test(cfg.database)) throw new Error('Selecciona explícitament proves.');
const cl = new OdooClient({ ...cfg, fetchImpl: (u,o) => fetch(u,{...o,signal:AbortSignal.timeout(60000)}) });
const name = 'MNL - factura: distribució i llegibilitat';
const viewName = 'MNL - flux acceptació i factura account.move';
const assetPath = '/mnl/invoice_layout.js';
const read = (m,d,f) => cl.searchRead(m,d,f,{context:{active_test:false},limit:100});
if (process.argv.includes('--rollback')) {
  const b=JSON.parse(readFileSync(process.argv[process.argv.indexOf('--rollback')+1],'utf8'));
  if (b.database!==cfg.database) throw new Error('Base incorrecta.');
  // Restore the old view before disabling the widget asset it could reference.
  for (const [model,old,created] of [['ir.ui.view',b.view,b.createdView],['ir.asset',b.asset,b.createdAsset],['ir.attachment',b.attachment,b.createdAttachment]]) {
    if(old) { const {id,...v}=old; if(model==='ir.ui.view')v.inherit_id=v.inherit_id?.[0]||false; await cl.write(model,[id],v); }
    else if(created&&model!=='ir.attachment') await cl.write(model,[created],{active:false});
  }
  console.log(JSON.stringify({database:cfg.database,rolledBack:true}));
} else if (!process.argv.includes('--apply')) {
  console.log(JSON.stringify({database:cfg.database,preview:true,view:viewName,asset:assetPath}));
} else {
  const [view]=await read('ir.ui.view',[['name','=',viewName]],['name','model','inherit_id','arch_db','active','priority']);
  const [asset]=await read('ir.asset',[['name','=',name]],['name','bundle','directive','path','active','sequence']);
  const [attachment]=await read('ir.attachment',[['url','=',assetPath]],['name','raw','mimetype','public','url','res_model']);
  const [base]=await read('ir.model.data',[['module','=','account'],['name','=','view_move_form']],['res_id']);
  const [field]=await read('ir.model.fields',[['model','=','account.move'],['name','=','x_mnl_source_order_ids']],['id']);
  if(!base||!field)throw new Error('Instal·la primer els camps del flux comercial.');
  mkdirSync('logs',{recursive:true}); const backupPath=resolve('logs',`odoo-invoice-layout-${cfg.database}-${Date.now()}.json`);
  const b={database:cfg.database,view,asset,attachment};const save=()=>writeFileSync(backupPath,JSON.stringify(b,null,2));save();
  const av={name:'mnl_invoice_layout.js',raw:readFileSync(new URL('./assets/invoice_layout.js',import.meta.url)).toString('base64'),mimetype:'text/javascript',public:true,url:assetPath,res_model:'ir.ui.view'};
  if(attachment)await cl.write('ir.attachment',[attachment.id],av);else {b.createdAttachment=await cl.create('ir.attachment',av);save();}
  const as={name,bundle:'web.assets_backend',directive:'append',path:assetPath,active:true,sequence:1150};
  if(asset)await cl.write('ir.asset',[asset.id],as);else {b.createdAsset=await cl.create('ir.asset',as);save();}
  const v={name:viewName,model:'account.move',inherit_id:base.res_id,arch_db:readFileSync(new URL('../templates/sales_flow_invoice_form.xml',import.meta.url),'utf8'),priority:1500,active:true};
  if(view)await cl.write('ir.ui.view',[view.id],v);else {b.createdView=await cl.create('ir.ui.view',v);save();}
  const after=await cl.call('account.move','get_view',[],{view_type:'form'});
  if(!after.arch.includes('mnl_invoice_lines'))throw new Error('La vista combinada no conté el renderer.');
  console.log(JSON.stringify({database:cfg.database,applied:true,backupPath,presentationOnly:true}));
}
