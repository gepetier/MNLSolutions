import assert from 'node:assert/strict';
import { requireConfig } from '../src/config.js';
import { OdooClient } from '../src/odooClient.js';
const c = requireConfig(); c.url = new URL(c.url).origin;
if (!process.env.ODOO_ENV_FILE || !/^provesmnl\d+$/.test(c.database)) throw new Error('Selecciona explicitament proves.');
const cl = new OdooClient({ ...c, fetchImpl: (u,o) => fetch(u,{...o,signal:AbortSignal.timeout(45000)}) });
await cl.authenticate();
const partners = await cl.searchRead('res.partner',[['active','=',true]],['is_company','commercial_partner_id','parent_id','lang','property_payment_term_id','type','name','street','street2','zip','city','country_id','vat','phone','email'],{limit:1000});
const company = partners.find(p=>p.is_company && (p.street || p.vat)) || partners.find(p=>p.is_company);
const other = partners.find(p=>p.is_company && p.id!==company.id);
const contact = partners.find(p=>!p.is_company && p.type==='contact' && p.commercial_partner_id[0]!==p.id);
assert(company && other, 'Calen dos clients empresa per fer la regressió.');
const custom = ['x_studio_contacte_pressupost_id','x_studio_idioma_document','payment_term_id'];
const fiscal = ['name','street','street2','zip','city','country_id','vat','phone','email','commercial_partner_id'].map(n=>'x_mnl_customer_'+n);
const definitions = await cl.fieldsGet('sale.order', []);
const fields = ['partner_id','state','date_order','validity_date','x_studio_condicions_acceptacio',...custom,...fiscal.filter(n=>definitions[n])];
const spec = Object.fromEntries(fields.map(k=>[k,{}]));
const samples=[];
let previous = {};
const witness = await cl.searchRead('sale.order', [['state', '=', 'draft']], ['write_date'], { limit: 1 });
const witnessIds = witness.map(row => row.id);
for (const [label,partner] of [['company',company],['switch_company',other],...(contact ? [['contact',contact]] : []),['clear',null]]) {
  const values = { ...Object.fromEntries(fiscal.filter(n=>definitions[n]).map(n=>[n,false])), ...previous, partner_id: partner?.id || false, state:'draft', date_order:'2026-10-19 10:00:00', validity_date:'2026-11-19', x_studio_idioma_document:'en_US', x_studio_contacte_pressupost_id:company.id, payment_term_id:2, x_studio_condicions_acceptacio:'' };
  // A fresh unsaved pseudo-record. No create/write RPC is used by this test.
  const result = await cl.call('sale.order','onchange',[[], values, ['partner_id'], spec]);
  const current = {...values,...result.value};
  if (process.argv.includes('--assert-fixed')) {
    assert.equal(current.x_studio_contacte_pressupost_id, label==='contact' ? partner.id : false, `${label}: contacte antic o incorrecte`);
    if(partner){
      assert.equal(current.x_studio_idioma_document,['ca_ES','es_ES','en_US'].includes(partner.lang)?partner.lang:'es_ES', `${label}: idioma`);
      const fiscalPartner=partners.find(p=>p.id===partner.commercial_partner_id[0]);
      for(const source of ['name','street','street2','zip','city','vat','phone','email']) assert.equal(current['x_mnl_customer_'+source],fiscalPartner[source],`${label}: dada fiscal ${source}`);
      if(partner.property_payment_term_id) assert.equal(current.payment_term_id,partner.property_payment_term_id[0],`${label}: pagament`);
    }else{
      assert.equal(current.payment_term_id,false,'clear: pagament anterior');
      assert.equal(current.x_studio_idioma_document,false,'clear: idioma anterior');
      for(const name of fiscal) assert.equal(current[name],false,`clear: ${name}`);
    }
  }
  previous = Object.fromEntries([...custom,...fiscal].filter(n=>n in current).map(n=>[n,current[n]]));
  samples.push({case:label,returnedFields:Object.keys(result.value||{}),contactCorrect:current.x_studio_contacte_pressupost_id===(label==='contact'?partner.id:false),languageCorrect:current.x_studio_idioma_document===(partner?(['ca_ES','es_ES','en_US'].includes(partner.lang)?partner.lang:'es_ES'):false),fiscalFieldsReturned:fiscal.filter(n=>n in (result.value||{})).length});
}
assert.deepEqual(await cl.searchRead('sale.order',[['id','in',witnessIds]],['write_date']),witness,'La prova no ha de modificar un pressupost existent.');
console.log(JSON.stringify({database:c.database,mode:'onchange-unsaved',fixed:process.argv.includes('--assert-fixed'),cases:samples},null,2));
