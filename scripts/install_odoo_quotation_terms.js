import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { requireConfig } from '../src/config.js';
import { OdooClient } from '../src/odooClient.js';
const c = requireConfig(); c.url = new URL(c.url).origin;
if (!process.env.ODOO_ENV_FILE || !/^provesmnl\d+$/.test(c.database)) throw Error('Selecciona proves explícitament.');
const api = new OdooClient({...c,fetchImpl:(u,o)=>fetch(u,{...o,signal:AbortSignal.timeout(45000)})});
const note = `<ol>
<li><strong>Validesa:</strong> oferta vàlida fins a la data indicada al pressupost; després caldrà confirmar preus i disponibilitat.</li>
<li><strong>Abast:</strong> s’inclouen únicament els materials i serveis detallats. Muntatge, mitjans d’elevació i retirada de residus només inclosos si s’especifiquen.</li>
<li><strong>Mides i acabats:</strong> abans d’acceptar, el client revisarà quantitats, dimensions, gruixos, colors i accessoris. Cal considerar retalls i solapaments en el material necessari per a l’obra.</li>
<li><strong>Acceptació i canvis:</strong> l’acceptació correspon a la referència i revisió indicades. Els canvis posteriors requereixen confirmació escrita i poden afectar preu i termini. Les modificacions o cancel·lacions de material a mida s’han de validar amb el fabricant.</li>
<li><strong>Subministrament:</strong> el termini es confirmarà en tramitar la comanda segons disponibilitat i planificació del fabricant. Les entregues parcials s’acordaran amb el client.</li>
<li><strong>Transport:</strong> inclòs només quan figura al pressupost, amb accés adequat per al vehicle acordat. Descàrrega, grua i esperes només incloses si s’indiquen. Els serveis addicionals es pressupostaran abans de fer-los.</li>
<li><strong>Recepció:</strong> comprovar els paquets i l’estat aparent del material; anotar les incidències visibles a l’albarà i comunicar-les al més aviat possible amb fotografies.</li>
<li><strong>Conservació:</strong> emmagatzematge, manipulació i instal·lació segons les instruccions del fabricant.</li>
<li><strong>Pagament:</strong> s’apliquen la forma de pagament i els impostos detallats. Qualsevol bestreta haurà de constar expressament.</li>
</ol>`;
const keys=['mnl_solutions.report_quotation_standard_document','mnl_solutions.report_quotation_v3_document'];
const views=await api.searchRead('ir.ui.view',[['key','in',keys]],['key','arch_db']);
assert(views.some(v=>v.key===keys[0]), 'Falta la plantilla predeterminada.');
const [order]=await api.searchRead('sale.order',[['id','=',59]],['state','x_mnl_frozen','note','amount_total']);
assert(order && order.state==='draft' && !order.x_mnl_frozen);
if(!process.argv.includes('--apply')){console.log(JSON.stringify({preview:true,views:2,order:59}));process.exit(0);}
mkdirSync('logs',{recursive:true});writeFileSync(`logs/quotation-terms-${Date.now()}.json`,JSON.stringify({database:c.database,views,order},null,2));
for(const v of views){const file=v.key.includes('_v3_')?'quotation_v3.xml':'quotation_standard.xml';await api.write('ir.ui.view',[v.id],{arch_db:readFileSync(new URL('../templates/'+file,import.meta.url),'utf8')});}
await api.write('sale.order',[59],{note});
const [after]=await api.searchRead('sale.order',[['id','=',59]],['note','amount_total']);assert.equal(after.amount_total,order.amount_total);assert(after.note.includes('Transport:'));
console.log(JSON.stringify({applied:true,database:c.database,order:59,totalsUnchanged:true,templates:views.length}));process.exit(0);
