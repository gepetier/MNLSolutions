import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { requireConfig } from '../src/config.js';
import { OdooClient } from '../src/odooClient.js';

const config = requireConfig();
config.url = new URL(config.url).origin;
if (!process.env.ODOO_ENV_FILE || !/^provesmnl\d+$/.test(config.database)) throw new Error('Selecciona explícitament una base de proves.');
const client = new OdooClient({ ...config, fetchImpl:(u,o)=>fetch(u,{...o,signal:AbortSignal.timeout(45000)}) });
const name = 'MNL - formulari de pressupost: amplada i client';
const assetPath = '/mnl/quotation_layout.js';
const fieldNames = ['name','vat','street','street2','zip','city','country_id','phone','email'];
const labels = ['Nom fiscal','NIF/CIF','Adreça fiscal','Adreça (continuació)','Codi postal','Població','País','Telèfon','Correu electrònic'];
const xml = `<data>
  <xpath expr="//group[@name='sale_header']" position="before"><div class="mnl_quote_layout_controls"/></xpath>
  <xpath expr="//group[@name='partner_details']" position="replace">
    <group name="partner_details" col="2">
      <separator name="mnl_client_title" string="Client" colspan="2"/>
      <div class="mnl_customer_card" colspan="2">
        <field name="x_mnl_customer_commercial_partner_id" invisible="1"/>
        <div class="mnl_customer_selection">
          <label for="partner_id" string="Client"/>
          <field name="partner_id" widget="many2one" context="{'res_partner_search_mode': 'customer', 'show_address': False, 'show_vat': False}" options="{'no_quick_create': True}" placeholder="Cerca un client…" readonly="state in ['cancel', 'sale']"/>
        </div>
        <div class="mnl_customer_grid">
          ${fieldNames.map((f,i)=>`<label for="x_mnl_customer_${f}" string="${labels[i]}"/><field name="x_mnl_customer_${f}" readonly="1" nolabel="1" ${f==='phone'?'widget="phone"':f==='email'?'widget="email"':''}/>`).join('\n          ')}
          <label for="x_studio_contacte_pressupost_id" string="Persona de contacte"/>
          <field name="x_studio_contacte_pressupost_id" nolabel="1" placeholder="Selecciona un contacte…" domain="[('commercial_partner_id', '=', x_mnl_customer_commercial_partner_id)]" options="{'no_create': True}" readonly="state not in ['draft', 'sent']"/>
        </div>
      </div>
    </group>
  </xpath>
</data>`;
await client.authenticate();
const read = (model,domain,fields)=>client.searchRead(model,domain,fields,{context:{active_test:false},limit:20});
if (process.argv.includes('--rollback')) {
  const b = JSON.parse(readFileSync(process.argv[process.argv.indexOf('--rollback')+1],'utf8'));
  if (b.database !== config.database) throw new Error('Base incorrecta.');
  for (const [model,old,created] of [['ir.ui.view',b.view,b.createdView],['ir.asset',b.asset,b.createdAsset],['ir.attachment',b.attachment,b.createdAttachment]]) {
    if (old) { const {id,...values}=old; await client.write(model,[id],values); }
    else if(created && model!=='ir.attachment') await client.write(model,[created],{active:false});
  }
  console.log(JSON.stringify({database:config.database,rolledBack:true})); process.exit(0);
}
const [base] = await read('ir.model.data',[['module','=','sale'],['name','=','view_order_form']],['res_id']);
const [view] = await read('ir.ui.view',[['name','=',name]],['name','model','inherit_id','arch_db','active','priority']);
const [asset] = await read('ir.asset',[['name','=',name]],['name','bundle','directive','path','active','sequence']);
const [attachment] = await read('ir.attachment',[['url','=',assetPath]],['name','raw','mimetype','public','url','res_model']);
const before = await client.call('sale.order','get_view',[],{view_type:'form'});
if(!base || !before.arch.includes('x_mnl_customer_name')) throw new Error('Falta la vista o els camps relacionats de client.');
if(!process.argv.includes('--apply')) {
  console.log(JSON.stringify({database:config.database,mode:'preview',view:name,existingView:view?.id,asset:assetPath,default:'amplada completa',customerFields:fieldNames}));process.exit(0);
}
mkdirSync('logs',{recursive:true});
const backupPath=resolve('logs',`odoo-quotation-layout-${config.database}-${Date.now()}.json`);
const backup={database:config.database,view,asset,attachment};
const save=()=>writeFileSync(backupPath,JSON.stringify(backup,null,2));save();
const values={name,model:'sale.order',inherit_id:base.res_id,arch_db:xml,priority:1200,active:true};
if(view) await client.write('ir.ui.view',[view.id],values);else {backup.createdView=await client.create('ir.ui.view',values);save();}
const av={name:'mnl_quotation_layout.js',raw:readFileSync('scripts/assets/quotation_layout.js').toString('base64'),mimetype:'text/javascript',public:true,url:assetPath,res_model:'ir.ui.view'};
if(attachment) await client.write('ir.attachment',[attachment.id],av);else {backup.createdAttachment=await client.create('ir.attachment',av);save();}
const as={name,bundle:'web.assets_backend',directive:'append',path:assetPath,active:true,sequence:1100};
if(asset) await client.write('ir.asset',[asset.id],as);else {backup.createdAsset=await client.create('ir.asset',as);save();}
const after=await client.call('sale.order','get_view',[],{view_type:'form'});
if(!after.arch.includes('mnl_customer_grid') || !after.arch.includes('mnl_quote_layout_controls')) throw new Error('La vista combinada no conté els canvis.');
console.log(JSON.stringify({database:config.database,applied:true,viewId:view?.id||backup.createdView,assetId:asset?.id||backup.createdAsset,backupPath}));
