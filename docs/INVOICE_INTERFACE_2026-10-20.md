# Interfície de factura — 20/10/2026

Aplicat exclusivament a provesmnl1410 sobre el flux de factures MNL procedents de comandes acceptades.

## Presentació

- Taula: Class., Article, Unitats, Longitud, Amplada, Quantitat, Unitat, Preu unitari, Impostos, Import sense IVA.
- Article ampli i amb salt de línia; compte comptable i referència per fila disponibles com a columnes opcionals, amagades per defecte.
- Títols de secció recuperats, amb referència acceptada d'origen al costat i subtotal natiu. Les seccions i l'ordre de les línies es conserven; no es creen agrupacions comercials noves.
- Dimensions no aplicables representades amb guió, conservant el valor numèric original.
- Títol «Factura en esborrany» i avís breu de revisió abans de comptabilitzar.
- Línies acceptades de només lectura al formulari: sense controls d'alta, eliminació o reordenació. Els apunts comptables continuen disponibles per revisió.
- Activitat lateral plegada inicialment; botó per mostrar-la/amagar-la i preferència recordada al navegador. Estils adaptats als colors del tema.

## Causa i solució

Amagar les columnes natives de producte/descripció també eliminava el camp que el renderer d'Odoo utilitza per als títols de secció. El widget `mnl_invoice_lines` deriva del widget natiu i conserva el seu comportament en documents sense origen MNL. En factures MNL utilitza Article com a columna de títol i representa la descripció nativa només a seccions i notes. La selecció del camp es fa en calcular les columnes, perquè les dades del pare poden arribar després del setup del component.

Cap modificació d'imports, línies ni instantànies acceptades. La factura de mostra continua en esborrany, amb el mateix total, dues comandes d'origen i 24 línies de producte vinculades.

## Instal·lació i reversió

`ODOO_ENV_FILE=/ruta/privada.env node scripts/install_odoo_invoice_layout.js --apply`

L'instal·lador del flux comercial també instal·la aquest asset abans d'actualitzar la vista de factura. Les còpies privades són a logs/odoo-invoice-layout-*.json. Reversió de la presentació: mateix script amb `--rollback FITXER`, restaurant primer la vista anterior i després l'asset. Escollir la còpia anterior al primer desplegament d'aquesta interfície per recuperar l'estat inicial. Si la sessió mostra una vista antiga després d'actualitzar, fer una recàrrega completa del navegador.

Validació: sintaxi JavaScript i XML; revisió visual del formulari real; seccions amb origen, columnes i dimensions verificades al DOM; botó lateral provat. Comprovació de factura en lectura: estat, total, comandes i línies intactes. No s'ha comptabilitzat ni enviat cap factura.
