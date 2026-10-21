# Comanda acceptada → esborranys de compra — 21/10/2026

Implementat i verificat exclusivament a provesmnl1410. Autorització: exigir proveïdor en crear productes i preparar automàticament una compra en esborrany per proveïdor quan es confirma la comanda de client. Aquesta decisió amplia l'abast històric que ajornava les compres; no habilita inventari, enviaments ni confirmació automàtica de compres.

## Comportament

1. Un producte de venda nou no es pot desar sense compra habilitada i almenys una tarifa nativa de proveïdor actiu (`product.supplierinfo`). Es pot crear tot en una sola operació amb seller_ids. Els productes no destinats a venda no queden afectats.
2. La confirmació comprova cada variant i línia: compra habilitada, proveïdor actiu, empresa, data, quantitat mínima, moneda i unitats. Es prioritza la seqüència nativa de proveïdors; no es crea un camp paral·lel de proveïdor ni s'utilitza standard_price com a cost real.
3. Després de congelar la versió acceptada i el seu PDF, es crea una RFQ en estat draft per proveïdor i per comanda de client. No s'agrupen comandes de client diferents en una compra.
4. Dins d'una RFQ es conserven les línies de venda separades, encara que comparteixin producte: dimensions diferents no es fusionen. Cada línia té sale_line_id natiu, la tarifa seleccionada i unitats/longitud/amplada acceptades. La compra conserva comanda, referència i revisió d'origen.
5. Quantitat de venda convertida a la unitat/envàs configurat del proveïdor; conversió inversa contrastada. Les unitats han de ser la base o un envàs explícit del producte. El preu prové de la tarifa seleccionada i es tracta amb les funcions natives de preu, impostos i moneda. Tarifa zero: RFQ amb avís de preu pendent; mai assumir un cost inventat.
6. Tot forma part de la mateixa transacció de confirmació. Si falla una validació o la generació, no s'accepta parcialment la comanda. No es generen compres en desar un pressupost ni es fan compres retroactives d'acceptats antics.
7. L'indicador readonly de generació i la comprovació de compres/línies ja vinculades impedeixen duplicar la generació. Cancel·lar o eliminar una RFQ no habilita una regeneració automàtica: s'ha de revisar expressament.
8. Les RFQ queden sense confirmar ni enviar. Revisió, ajust i enviament al proveïdor continuen manuals.

## Interfície i permisos

Comanda: pestanya «Compres a proveïdors», amb RFQ, proveïdor, estat i import. Botó natiu de compres disponible gràcies a sale_line_id. Compra: comanda/referència/revisió d'origen i dimensions per línia. Producte: avís al formulari sobre el proveïdor obligatori.

La generació usa privilegis interns només per crear les RFQ dins l'empresa de la comanda; no concedeix grups ni permisos nous. La pestanya de compres requereix el grup natiu d'usuari de compres. Prova executada amb el compte de treball; no s'ha provat una acceptació real de client pel portal ni perfils d'usuari amb permisos restringits.

## Dades existents i transport

Els set productes diferents del pressupost de mostra no tenien tarifes natives de proveïdor a l'auditoria. No se'ls ha assignat cap proveïdor ni preu per suposició. Abans de confirmar-los cal configurar-los a Compra; el pressupost original continua en esborrany. El proveïdor de transport del model MNL dedicat no es transforma automàticament en una tarifa nativa: cal vincular el producte amb un proveïdor natiu abans de confirmar-lo.

L'exemple funcional conservat usa dos proveïdors i dos productes nous, tots explícitament ficticis. Una comanda acceptada conté dues mides de placa i cargols; origina dues RFQ en esborrany. El pressupost de treball i les factures anteriors es conserven.

## Validació

Banc `scripts/test_odoo_purchase_flow.js --apply` amb ODOO_ENV_FILE de proves explícit. Comprovats: rebuig de producte sense proveïdor i reversió de la creació; confirmació amb congelació/PDF; una RFQ per proveïdor; vincles i dimensions; agrupació de dues línies de placa en un proveïdor; conversió de 200 unitats a dues caixes de 100; preus natius; no duplicació en repetir confirmació o executar directament el generador; proveïdor absent amb reversió; original intacte. Proves addicionals amb tarifa caducada i quantitat mínima no assolida, restaurant les dades fictícies. Revisió de pestanya i comptador natiu al navegador. Cap RFQ confirmada o enviada.

## Instal·lació i reversió

`ODOO_ENV_FILE=/ruta/privada.env node scripts/install_odoo_purchase_flow.js --apply`

Requereix el flux comercial de congelació ja instal·lat. Afegeix 10 camps manuals, dues accions, una automatització de creació de productes i tres vistes. La integració de confirmació usa el paràmetre mnl.purchase_flow_action_id; actualitza el codi de congelació i activa el paràmetre al final. Reexecutar la instal·lació és idempotent.

Còpia privada prèvia a cada instal·lació: logs/odoo-purchase-flow-*.json. Reversió: mateix script amb `--rollback FITXER`. Per retirar aquest desplegament, usar la còpia anterior a la primera instal·lació. Restaura el paràmetre, l'acció de congelació, les accions/regles i les vistes; conserva camps, compres, PDF i vincles existents. Mai publicar backups, captures o dades de proveïdors.

## Altres decisions que continuen pendents

La regla posterior de facturació és una comanda → diverses factures i cada factura → una sola comanda. La restricció antiga de factura total i agrupació de diverses comandes encara s'ha d'adaptar; el canvi de compres no modifica aquestes regles de factura. L'exemple agrupat anterior de factura és una prova històrica, no el model futur aprovat. Pendents també: facturació parcial/rectificatives, cancel·lació d'acceptats i acceptació real pel portal. Principal no modificada.
