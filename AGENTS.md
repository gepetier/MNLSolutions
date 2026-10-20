# Context del projecte MNLSolutions

## Lectura inicial

Abans de continuar, llegeix en aquest ordre:

1. `docs/DEVELOPMENT_HANDOFF_2026-10-14.md`: punt de represa i limitacions.
2. `README.md` i `docs/DEVELOPMENT_SETUP.md`: arrencada i configuració.
3. `docs/ENVIRONMENTS.md`: selecció explícita de l'entorn Odoo.
4. `docs/01_Estructura_Base_Odoo_MNL.md` i `docs/02_Handoff_Codex_Odoo_MNL_Fase1.md`: mestres funcionals; el 02 preval quan corregeix el 01.
5. `TODO.md` i `docs/PRODUCTION_PROMOTION_2026-09-23.md`: feina pendent i desplegament documentat.
6. Els registres de contactes, famílies, subfamílies i preus del 23/09 segons la tasca.

## Decisions que cal conservar

- Fase actual: productes, clients i pressupostatge, sobre Odoo Online Enterprise + Studio.
- Catàleg local: 87 bases × 5 chapes × 12 recobriments = 5.220 variants.
- Conservar el pricing natiu `price_extra → lst_price → price_unit`.
- Quantitat: `x_studio_uds` és l'entrada; `product_uom_qty` és el resultat calculat.
- Sense bloc d'entrega/obra/ENVIO al pressupost; fase 1 amb revisió A.
- Pagaments: termes natius Transferència Bancaria, Rebut bancari 30 dies i Confirming 60 dies.
- Portes és l'excepció aprovada de proveïdor/cost/marge. La lògica genèrica de costos, compres, inventari i facturació real continua ajornada.
- Flux comercial aprovat i provat només a proves: pressupost acceptat congelat amb PDF → comanda bloquejada → factura total en esborrany; comptabilització manual. Vegeu `docs/SALES_ORDER_INVOICE_FLOW_IMPLEMENTED_2026-10-20.md` i el punt de represa adjacent. Bestretes, parcials, rectificatives i cancel·lacions d’acceptats pendents de definir.
- La versió PREUS 23/09/2026 només consta creada a proves; la promoció a principal continua pendent.

## Entorns i evidència

Els noms de bases dels documents són l'últim estat conegut, no una comprovació d'accés actual. Les còpies de proves caduquen. Configura `ODOO_ENV_FILE`, comprova la base en lectura i prova els canvis a la còpia neutralitzada vigent. Abans d'escriure a principal cal autorització per al canvi concret, prova, preview i rollback. No reutilitzis una aprovació de desplegament històrica.

Les auditories datades són històriques. No presentar-les com a observacions noves. No marcar una tasca com a completada només perquè existeixi codi. Actualitza TODO, README i el punt de represa quan canviïn decisions o estat, citant l'evidència i la data. No dependre de l'historial del xat per preservar decisions.

## Fitxers i comprovacions

El codi de les eines de setembre recuperat de tmp és a `scripts/archive/2026-09-23/`; llegeix-ne el README abans d'utilitzar-lo. Alguns plans intermedis estan superats per la jerarquia final de 31 subfamílies.

No versionar claus, `.env`, contactes, factures, pressupostos ni outputs privats. `MNL_SENSITIVE_DATA_DIR` apunta fora del repo. El clone conté el context funcional, però l'accés Odoo i les dades locals es recuperen per un canal privat.

Comprovacions locals: `npm run check`, `npm run catalog:combinations`, `npm run catalog:quote`. Per Python: entorn virtual i `requirements.txt`. Cap comprovació d'aquest tipus requereix escriure a Odoo.
