// Creates only clearly marked fictitious suppliers, products and quotations in tests.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {requireConfig} from '../src/config.js';import {OdooClient} from '../src/odooClient.js';
const c=requireConfig();c.url=new URL(c.url).origin;
if(!process.argv.includes('--apply')||!process.env.ODOO_ENV_FILE||!/^provesmnl\d+$/.test(c.database))throw Error('Selecciona proves i --apply.');
const cl=new OdooClient({...c,fetchImpl:(u,o)=>fetch(u,{...o,signal:AbortSignal.timeout(90000)})});
const read=(m,d,f)=>cl.searchRead(m,d,f,{limit:10000});
const stamp=Date.now(), prefix='MNL-QA-PURCHASE-'+stamp;
const result={database:c.database,prefix,checks:[],products:[],vendors:[],orders:[],purchases:[]};mkdirSync('outputs/purchase-flow',{recursive:true});const path='outputs/purchase-flow/test-'+stamp+'.json';const save=()=>writeFileSync(path,JSON.stringify(result,null,2));const check=name=>{result.checks.push(name);save();console.log(JSON.stringify({passed:name}));};
const rejects=async(name,fn,regex)=>{let error;try{await fn()}catch(e){error=e;}assert.ok(error,name);if(regex)assert.match(error.message,regex);check(name);};
try{
 const [client]=await read('res.partner',[['name','ilike','CLIENT DEMOSTRACIÓ MNL'],['parent_id','=',false]],['name']);assert.ok(client.name.includes('NO REAL'));
 const [original]=await read('sale.order',[['id','=',59]],['state','amount_total','name']);assert.equal(original.state,'draft');result.original=original;save();
 await rejects('product_without_vendor_cannot_be_created',()=>cl.create('product.template',{name:prefix+'-INVALID',sale_ok:true,purchase_ok:true}),/proveïdor/);
 assert.equal((await read('product.template',[['name','=',prefix+'-INVALID']],['id'])).length,0);check('invalid_product_creation_rolls_back');
 for(const suffix of ['PANELLS','CARGOLS']){const id=await cl.create('res.partner',{name:prefix+'-'+suffix+' — NO REAL',is_company:true,supplier_rank:1,email:'qa@example.invalid',lang:'ca_ES'});result.vendors.push(id);save();}
 const sourceLines=await read('sale.order.line',[['order_id','=',59],['display_type','=',false]],['product_id','x_studio_tipus_calcul']);
 const panelSource=sourceLines.find(x=>x.x_studio_tipus_calcul==='m2');const unitSource=sourceLines.find(x=>x.x_studio_tipus_calcul==='uds');assert.ok(panelSource&&unitSource);
 const [panel]=await read('product.product',[['id','=',panelSource.product_id[0]]],['uom_id','categ_id']);const [unit]=await read('product.product',[['id','=',unitSource.product_id[0]]],['uom_id','categ_id']);
 const pack=await cl.create('uom.uom',{name:prefix+' Caixa 100',relative_uom_id:unit.uom_id[0],relative_factor:100});result.pack=pack;save();
 for(const def of [{label:'PLACA',kind:'m2',unit:panel.uom_id[0],category:panel.categ_id[0],vendor:result.vendors[0],price:10},{label:'CARGOLS',kind:'uds',unit:unit.uom_id[0],category:unit.categ_id[0],vendor:result.vendors[1],price:30,pack}]){
  const id=await cl.create('product.template',{name:prefix+'-'+def.label+' — NO REAL',sale_ok:true,purchase_ok:true,type:'consu',categ_id:def.category,uom_id:def.unit,x_studio_tipus_calcul:def.kind,list_price:50,...def.pack?{uom_ids:[[6,0,[def.pack]]]}:{},seller_ids:[[0,0,{partner_id:def.vendor,price:def.price,min_qty:0,sequence:1,uom_id:def.pack||def.unit}]]});result.products.push(id);save();
 }
 const products=await read('product.product',[['product_tmpl_id','in',result.products]],['product_tmpl_id']);const panelId=products.find(x=>x.product_tmpl_id[0]===result.products[0]).id;const screwId=products.find(x=>x.product_tmpl_id[0]===result.products[1]).id;
 const make=async(suffix,lines)=>{const id=await cl.create('sale.order',{partner_id:client.id,name:prefix+'-'+suffix+'-A',x_studio_referencia:prefix+'-'+suffix,x_studio_revisio:'A',x_studio_idioma_document:'ca_ES',x_studio_condicions_acceptacio:'DOCUMENT DE PROVES — SENSE VALIDESA COMERCIAL. Prova de compres automàtiques.',order_line:lines.map(v=>[0,0,v])});result.orders.push(id);save();return id;};
 const order=await make('TWO-VENDORS',[{product_id:panelId,x_studio_uds:2,x_studio_long:3,x_studio_ancho_1:1,price_unit:50},{product_id:panelId,x_studio_uds:1,x_studio_long:2,x_studio_ancho_1:1,price_unit:50},{product_id:screwId,x_studio_uds:200,price_unit:1}]);
 await cl.call('sale.order','action_confirm',[[order]]);
 const [accepted]=await read('sale.order',[['id','=',order]],['state','locked','x_mnl_frozen','x_mnl_purchase_generated','x_mnl_purchase_order_ids','x_mnl_accepted_document_id']);assert.equal(accepted.state,'sale');assert.ok(accepted.locked&&accepted.x_mnl_frozen&&accepted.x_mnl_purchase_generated&&accepted.x_mnl_accepted_document_id);check('accepted_order_frozen_and_purchases_generated');
 const purchases=await read('purchase.order',[['x_mnl_source_order_id','=',order]],['partner_id','state','x_mnl_source_ref','x_mnl_source_revision','origin']);result.purchases=purchases.map(x=>x.id);save();assert.equal(purchases.length,2);assert.ok(purchases.every(x=>x.state==='draft'));assert.deepEqual(purchases.map(x=>x.partner_id[0]).sort(),[...result.vendors].sort());assert.ok(purchases.every(x=>x.x_mnl_source_revision==='A'&&x.x_mnl_source_ref===prefix+'-TWO-VENDORS-A'));check('one_unsent_draft_per_vendor_from_one_order');
 const pol=await read('purchase.order.line',[['order_id','in',result.purchases],['display_type','=',false]],['order_id','product_qty','uom_id','price_unit','sale_line_id','x_mnl_units','x_mnl_length','x_mnl_width']);assert.equal(pol.length,3);assert.equal(new Set(pol.map(x=>x.sale_line_id[0])).size,3);check('dimensions_and_separate_sales_lines_traced');
 const screwLine=pol.find(x=>x.order_id[0]===purchases.find(p=>p.partner_id[0]===result.vendors[1]).id);assert.equal(screwLine.product_qty,2);assert.equal(screwLine.uom_id[0],pack);assert.equal(screwLine.price_unit,30);assert.equal(screwLine.x_mnl_units,200);check('200_units_convert_to_two_supplier_packs_without_changing_sale');
 const panels=pol.filter(x=>x.order_id[0]!==screwLine.order_id[0]);assert.deepEqual(panels.map(x=>x.product_qty).sort(),[2,6]);assert.ok(panels.every(x=>x.price_unit===10&&x.x_mnl_width===1));check('two_panel_dimensions_group_in_one_vendor_draft');
 try{await cl.call('sale.order','action_confirm',[[order]]);}catch(e){assert.match(e.message,/confirm|congel|bloque|pedido|presup|state/i);}assert.equal((await read('purchase.order',[['x_mnl_source_order_id','=',order]],['id'])).length,2);check('repeat_confirmation_does_not_duplicate_purchases');
 const [generator]=await read('ir.actions.server',[['name','=','MNL - compres des de comanda generar esborranys']],['id']);
 await cl.call('ir.actions.server','run',[[generator.id]],{context:{active_model:'sale.order',active_id:order,active_ids:[order]}});
 assert.equal((await read('purchase.order',[['x_mnl_source_order_id','=',order]],['id'])).length,2);check('repeat_generation_action_is_idempotent');
 // Existing catalogue products are not silently assigned invented suppliers.
 const bad=await make('MISSING-VENDOR',[{product_id:panelSource.product_id[0],x_studio_uds:1,x_studio_long:2,x_studio_ancho_1:1,price_unit:10}]);await rejects('missing_vendor_blocks_confirmation',()=>cl.call('sale.order','action_confirm',[[bad]]),/proveïdor/);const [after]=await read('sale.order',[['id','=',bad]],['state','x_mnl_frozen','x_mnl_accepted_document_id']);assert.equal(after.state,'draft');assert.equal(after.x_mnl_frozen,false);assert.equal(after.x_mnl_accepted_document_id,false);assert.equal((await read('purchase.order',[['x_mnl_source_order_id','=',bad]],['id'])).length,0);check('failed_confirmation_leaves_no_pdf_purchase_or_frozen_state');
 const [unchanged]=await read('sale.order',[['id','=',59]],['state','amount_total','name']);assert.deepEqual(unchanged,original);check('working_quotation_unchanged');result.success=true;save();console.log(JSON.stringify({success:true,path,orders:result.orders,purchases:result.purchases,checks:result.checks.length,purchasesConfirmed:0,purchasesSent:0}));process.exit(0);
}catch(e){result.error=e.message;save();console.error(JSON.stringify({success:false,path,error:e.message.slice(0,600)}));process.exit(1);}
