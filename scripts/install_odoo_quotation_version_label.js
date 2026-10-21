import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { requireConfig } from '../src/config.js';
import { OdooClient } from '../src/odooClient.js';
const c = requireConfig(); c.url = new URL(c.url).origin;
if (!process.env.ODOO_ENV_FILE || !/^provesmnl\d+$/.test(c.database)) throw Error('Selecciona proves explícitament.');
const api = new OdooClient({ ...c, fetchImpl: (u, o) => fetch(u, { ...o, signal: AbortSignal.timeout(30000) }) });
const name = 'MNL - Nova versió al menú de pressupost';
const url = '/mnl/quotation_version_label.js';
const [attachment] = await api.searchRead('ir.attachment', [['url', '=', url]], ['name', 'raw', 'mimetype', 'public', 'url', 'res_model'], { limit: 1 });
const [asset] = await api.searchRead('ir.asset', [['name', '=', name]], ['name', 'bundle', 'directive', 'path', 'active', 'sequence'], { limit: 1 });
if (!process.argv.includes('--apply')) { console.log(JSON.stringify({ preview: true, database: c.database, name, scope: 'sale.order draft/sent' })); process.exit(0); }
mkdirSync('logs', { recursive: true });
writeFileSync(`logs/quotation-version-label-${Date.now()}.json`, JSON.stringify({ database: c.database, attachment, asset }, null, 2));
const values = { name: 'quotation_version_label.js', raw: readFileSync(new URL('./assets/quotation_version_label.js', import.meta.url)).toString('base64'), mimetype: 'text/javascript', public: true, url, res_model: 'ir.ui.view' };
if (attachment) await api.write('ir.attachment', [attachment.id], values); else await api.create('ir.attachment', values);
const av = { name, bundle: 'web.assets_backend', directive: 'append', path: url, active: true, sequence: 1201 };
if (asset) await api.write('ir.asset', [asset.id], av); else await api.create('ir.asset', av);
console.log(JSON.stringify({ applied: true, database: c.database, label: 'Nova versió' }));
process.exit(0);
