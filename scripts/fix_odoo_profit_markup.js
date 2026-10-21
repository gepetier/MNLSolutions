import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { requireConfig } from '../src/config.js';
import { OdooClient } from '../src/odooClient.js';
const c=requireConfig();c.url=new URL(c.url).origin;
if(!process.env.ODOO_ENV_FILE||!/^provesmnl\d+$/.test(c.database))throw Error('Selecciona proves explícitament.');
const api=new OdooClient({...c,fetchImpl:(u,o)=>fetch(u,{...o,signal:AbortSignal.timeout(45000)})});
const actions=await api.searchRead('ir.actions.server',[['code','ilike','def mnl_profit_values']],['name','code','model_id']);
assert(actions.length,'Falten les accions de marge.');
const changes=actions.map(a=>{
 let code=a.code;
 if(!code.includes('final = round(base / (1.0 - target / 100.0), precision)'))return null;
 code=code.replace('expected = nominal / (base + nominal) * 100.0 if base + nominal else 0.0','expected = nominal / base * 100.0 if base else 0.0')
 .replace('if target < 0.0 or target >= 100.0:', 'if target < 0.0:')
 .replace('El marge percentual sobre el preu final ha de ser inferior al 100%.','L’increment percentual sobre el preu base no pot ser negatiu.')
 .replace('final = round(base / (1.0 - target / 100.0), precision)','final = round(base * (1.0 + target / 100.0), precision)')
 .replace('actual_percent = nominal / final * 100.0 if final else 0.0','actual_percent = nominal / base * 100.0 if base else 0.0');
 assert(!code.includes('nominal / final * 100.0'));
 return {...a,newCode:code};
}).filter(Boolean);
const fields=await api.searchRead('ir.model.fields',[['model','=','sale.order.line'],['name','in',['x_mnl_profit_percent','x_mnl_profit_nominal']]],['field_description','help']);
if(!process.argv.includes('--apply')){console.log(JSON.stringify({preview:true,actions:changes.map(a=>a.id),formula:'base * (1 + percent / 100)'}));process.exit(0);}
mkdirSync('logs',{recursive:true});writeFileSync(`logs/profit-markup-${Date.now()}.json`,JSON.stringify({database:c.database,actions,fields},null,2));
for(const a of changes)await api.write('ir.actions.server',[a.id],{code:a.newCode});
for(const f of fields)await api.write('ir.model.fields',[f.id],{help:'Increment sobre el preu base. Exemple: base 100 €, increment 20% = preu 120 €. El percentatge es calcula com increment en euros / preu base × 100.'});
const main=actions.find(a=>a.name==='MNL - Recalculate MNL totals');assert(main);
const lines=await api.searchRead('sale.order.line',[['order_id.state','in',['draft','sent']],['order_id.x_mnl_frozen','=',false],['x_mnl_profit_initialized','=',true],['x_mnl_is_portes','=',false]],['order_id']);
const ids=[...new Set(lines.map(l=>l.order_id[0]))];
if(ids.length)await api.call('ir.actions.server','run',[[main.id]],{context:{active_model:'sale.order',active_ids:ids,active_id:ids[0]}});
const deployed=await api.searchRead('ir.actions.server',[['id','in',actions.map(a=>a.id)]],['code']);
assert(deployed.every(a=>!a.code.includes('final = round(base / (1.0 - target / 100.0), precision)')));
const sample=deployed[0].code;const start=sample.indexOf('def mnl_profit_values(');const end=sample.indexOf('\ndef ',start+1);
writeFileSync('scripts/assets/quote_profit_values.py',sample.slice(start,end<0?undefined:end)+'\n');
console.log(JSON.stringify({applied:true,actions:changes.length,recalculatedDrafts:ids.length,acceptedUntouched:true}));process.exit(0);
