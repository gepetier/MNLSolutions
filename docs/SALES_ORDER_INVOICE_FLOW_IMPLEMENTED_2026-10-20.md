# Flux pressupost → comanda → factura — 20/10/2026

Decisió aprovada: pressupost acceptat → comanda bloquejada → factura total en esborrany → revisió i comptabilització manual. Aquest registre substitueix l'abast només analític de l'auditoria anterior. Implementació exclusiva a provesmnl1410; principal no modificada.

## Acceptació i revisió

La confirmació conserva una instantània comercial, les dades de cada línia i un PDF privat del pressupost acceptat. La comanda queda bloquejada; es rebutgen canvis comercials, desbloqueig i eliminació de línies. El PDF acceptat també queda protegit contra modificació i eliminació. Les automatitzacions utilitzen un identificador intern privat, no un booleà aportat pel client.

La data d'emissió es conserva independentment de date_order. La confirmació té camp propi al costat de l'emissió, ocult mentre el document és un pressupost. Una nova proposta ha de partir d'una còpia en esborrany amb revisió explícita, conservant la versió acceptada.

## Factura i traçabilitat

La factura manté els vincles natius sale_line_ids i afegeix l'ordre, referència i revisió acceptades a cada línia. Copia article, classificador, unitats, longitud, amplada i tipus de càlcul; contrasta quantitat, preu, descompte i impostos amb les línies acceptades. La pestanya d'orígens identifica totes les comandes, revisions, dates i PDF acceptats. També conserva les condicions comercials de cada font.

La factura captura les dades fiscals del client en crear-se; completar el NIF després de l'acceptació no altera el pressupost acceptat. La creació es rebutja si manca el NIF. L'agrupació requereix mateix client fiscal, moneda, terme de pagament i idioma. En aquesta primera versió només s'admet facturació total, sense bestretes ni parcials. La comptabilització continua manual.

La comanda manté la presentació MNL. La factura disposa de plantilla pròpia coherent amb les dades del pressupost, amb origen per línia quan agrupa comandes. La plantilla inicial de factura té etiquetes en català; queda pendent afinar altres idiomes.

## Evidència i límits

Banc d'integració executat sobre còpies explícitament fictícies: 12 comprovacions superades (confirmació atòmica, dimensions, bloqueig, PDF, dues revisions en una factura, dades de línia, no duplicació i original intacte). Prova addicional de NIF absent: creació revertida, client restaurat i PDF acceptat inalterat. PDFs de comanda i factura revisats visualment. No s'han enviat documents ni comptabilitzat factures.

Es conserven dues comandes fictícies acceptades i una factura agrupada en esborrany per revisió. El pressupost original de treball continua en esborrany; la factura històrica no s'ha modificat. No s'ha exercitat una signatura real de client pel portal: la prova cobreix la confirmació d'Odoo via API. Cancel·lacions de comandes congelades, rectificatives i parcials requereixen un flux posterior explícit.

## Reproducció i reversió

Instal·lació: `ODOO_ENV_FILE=/ruta/privada.env node scripts/install_odoo_sales_invoice_flow.js --apply`. Requereix base de proves seleccionada explícitament. Banc amb escriptures: `node scripts/test_odoo_sales_invoice_flow.js ID_PRESSUPOST_FICTICI --apply` amb el mateix entorn.

Cada instal·lació desa còpia privada a logs/odoo-sales-flow-*.json i l'instal·lador de pressupostos té còpia pròpia. L'opció --rollback FITXER restaura vistes, informes i automatitzacions segons aquesta còpia; refusa revertir mentre existeixin documents congelats, per preservar la traçabilitat. Els camps es conserven. No publicar aquests logs, PDFs ni les dades privades.

## Validació de represa completada

S'ha repetit el banc complet després d'instal·lar el token intern i les proteccions del PDF: 12 comprovacions superades, més comprovacions addicionals del bloqueig amb context booleà, modificació/eliminació del PDF i còpia d'una comanda acceptada a esborrany editable sense instantània. Les dues comandes de revisió tornen a estar bloquejades. S'han retirat exclusivament les còpies fictícies creades en aquesta execució.

La incidència pendent provenia d'una comprovació sobre una comanda ja desbloquejada per una prova anterior: escriure el mateix valor no activa una automatització amb camps vigilats. S'ha restaurat el bloqueig i verificat la transició real True → False, que ara és rebutjada. El banc permanent exigeix partir d'una confirmació nova i incorpora aquestes regressions. No s'ha identificat una fallada residual de old_values.
