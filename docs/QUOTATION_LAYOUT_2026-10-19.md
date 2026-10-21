# Amplada del formulari i dades de client — 19/10/2026

Aplicat a `provesmnl1410`. Vista heretada 2284 (prioritat 1200), asset 1 a `web.assets_backend`, font `scripts/assets/quotation_layout.js`. Instal·lador: `scripts/install_odoo_quotation_layout.js`; requereix selecció explícita d'una base de proves, fa preview per defecte i aplica amb `--apply`.

- Amplada completa per defecte. Botó «Mostrar espai lateral» / «Amagar espai lateral», amb preferència local al navegador. No escriu al pressupost.
- Targeta de client amb selector natiu `many2one`, sense repetir adreça/NIF dins el selector; etiquetes i valors en dues columnes fixes mitjançant CSS grid. Telèfon i correu amb widgets natius. Contacte editable, restringit al client fiscal.
- Manté els camps relacionats i les automatitzacions d'herència de client existents. Sense canvis als imports, marges, descomptes ni documents PDF.
- Conserva l'ocultació del chatter existent; el botó alterna la distribució/amplada, no reactiva els missatges.

## Verificació

Vista combinada verificada en CA/ES/EN. Prova visual al navegador sobre el pressupost ja existent de la captura: targeta carregada, botó alternant els dos estats. Comprovació feta a la resolució disponible del navegador (1363 px); pendent comprovació manual a la pantalla gran de l'usuari. L'accés amb `debug=1` ha renovat la vista antiga en memòria cau. Després s'ha tornat a mode normal.

`npm run check` correcte. Regressió RPC d'herència de client executada amb l'eina de lectura existent (vegeu el log privat), sense desar pressupostos ni modificar contactes.

## Reversió

Còpia prèvia privada: `logs/odoo-quotation-layout-provesmnl1410-1792411215694.json` (primera instal·lació). `--rollback <còpia>` restaura la vista i l'asset previs, o desactiva els creats. L'adjunt JS creat queda sense ús quan l'asset es desactiva. No versionar logs ni dades privades.
