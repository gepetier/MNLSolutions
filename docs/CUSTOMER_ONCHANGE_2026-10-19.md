# Dades del client al pressupost — 19/10/2026

## Incidència reproduïda

A `provesmnl1410`, seleccionar o canviar `partner_id` no actualitzava el contacte ni l'idioma MNL abans de desar. L'acció d'inicialització existent funcionava sobre registres persistits. El formulari tampoc mostrava un bloc explícit de dades fiscals ni el camp editable de contacte.

Una prova d'`onchange` amb pressupost sense desar reproduïa el contacte i l'idioma antics en els quatre casos: empresa, canvi d'empresa, contacte vinculat i retirada de client. Els càlculs dimensionals comprovats durant el diagnòstic retornaven resultats correctes; no s'han modificat.

## Correcció aplicada a proves

Script: `scripts/fix_odoo_customer_onchange.js`.

- Deu camps relacionats no emmagatzemats a `sale.order`, sota el prefix `x_mnl_customer_`, consulten `partner_id.commercial_partner_id`: nom fiscal, adreça, continuació, codi postal, població, país, NIF, telèfon, correu i referència al client fiscal.
- Vista heretada `MNL - dades de client en directe`, ID 2280, al bloc Client. La persona de contacte existent torna a ser visible i editable. El domini limita els contactes al client fiscal.
- Automatització UI ID 86, exclusivament en canvi de `partner_id`: renova idioma, pagament i contacte i elimina valors anteriors en retirar el client. Si s'escull un contacte d'empresa, mostra les dades fiscals de l'empresa i selecciona aquella persona. Si s'escull una empresa, el contacte queda buit i editable.
- Automatització de persistència ID 87: aplica la mateixa herència quan canvia el client d'un esborrany existent per API/escriptura. No substitueix la inicialització de creació ni la revisió comercial històrica.
- El pagament reutilitza els termes natius autoritzats; si manca un terme admès, proposa transferència.
- Els canvis manuals posteriors d'idioma, contacte o pagament no són camps disparadors de les noves regles.

No s'han modificat les fitxes dels clients, els imports, les automatitzacions de càlcul ni la base principal. No s'han migrat les personalitzacions de marges del 14/10 que encara falten als instal·ladors de Git.

## Evidència i límits

- `scripts/test_odoo_customer_onchange_readonly.js --assert-fixed`: quatre casos verificats contra el mètode `onchange` real d'Odoo. La prova utilitza pseudoregistres sense crear pressupostos i comprova que un esborrany existent conserva `write_date`.
- Verificats dades fiscals de la societat, idioma, pagament configurat, selecció/neteja de contacte i eliminació de dades anteriors en canviar/retirar el client.
- La vista combinada retornada per `get_view` conté els camps al bloc Client.
- Sintaxi JavaScript comprovada amb `npm run check`.
- Pendent comprovar visualment en un navegador autenticat i validar el flux de desar amb les inicialitzacions històriques. Les proves RPC no demostren aquesta verificació visual ni la impressió del PDF.

## Execució i reversió

Seleccionar un fitxer privat amb `ODOO_ENV_FILE`; el script normalitza la URL a l'origen i rebutja bases fora de `provesmnl` seguit de dígits.

```bash
node scripts/fix_odoo_customer_onchange.js
node scripts/fix_odoo_customer_onchange.js --apply
node scripts/test_odoo_customer_onchange_readonly.js --assert-fixed
node scripts/fix_odoo_customer_onchange.js --rollback logs/odoo-customer-onchange-BASE-TIMESTAMP.json
```

L'aplicació desa un backup privat abans de cada canvi i registra els IDs creats. La reversió desactiva les regles/vista noves i restaura les anteriors si existien; conserva els camps relacionats nous sense eliminar-los. El backup és a `logs/`, exclòs de Git, i no conté claus.

## Banc per interfície — 20/10/2026

La selecció d’un contacte com a client conserva dades fiscals, contacte i idioma després de desar i al PDF. Però canviar a empresa i seleccionar manualment un contacte **abans del mateix desament** perd la selecció en persistir. Tornar a seleccionar/desar el contacte en una segona operació sí el conserva. Incidència pendent C19 de `QUOTATION_TEST_BENCH_2026-10-20.md`; les proves RPC anteriors no cobreixen aquesta seqüència completa del formulari.
