# Context del projecte MNLSolutions

## Ús eficient de tokens i abast de les tasques (21/10/2026)

- Aplicar aquestes regles en totes les sessions del repositori; no dependre del context del xat.
- Canvis petits de color, text o distribució: editar només els fitxers afectats, fer una comprovació específica i, si afecta la presentació, una única revisió visual. No repetir auditories completes ni crear documents o dades de prova nous sense necessitat.
- Llegir només el context necessari. La llista de lectura inicial següent és un índex de referència, no una lectura íntegra obligatòria a cada sessió. Consultar els mestres funcionals quan el canvi afecti regles de negoci.
- Reutilitzar evidència vigent i eines existents. Ampliar proves només davant canvis de lògica, errors o riscos concrets; mantenir les comprovacions necessàries per a imports, congelació, traçabilitat i dades.
- Fer cerques acotades i agrupar lectures independents. Retornar fragments, resums i metadades útils; evitar volcar fitxers grans, registres complets o catàlegs sencers d'eines.
- No ampliar l'encàrrec amb refactoritzacions, reauditories o millores no demanades. Aturar-se quan el resultat sol·licitat estigui verificat.
- Comunicació breu: explicar el canvi, la comprovació i les limitacions materials. No repetir plans, context ni justificacions.
- Per canvis de documentació o instruccions de treball, actualitzar el document autoritatiu afectat; no replicar el mateix text a README, TODO i handoffs si no canvia l'estat funcional.
- No afirmar xifres de tokens o estalvi sense una mesura disponible.

## Lectura inicial

Consulta segons la tasca, amb aquest ordre de prioritat:

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
- Des del 21/10, compres en esborrany autoritzades i provades només a proves: proveïdor natiu obligatori en crear productes de venda, una RFQ per proveïdor i comanda en confirmar. Vegeu `docs/PURCHASE_FLOW_2026-10-21.md`. Inventari i confirmació/enviament automàtic de compres no autoritzats; la lògica genèrica de marge continua ajornada.
- Flux comercial aprovat i provat només a proves: pressupost acceptat congelat amb PDF → comanda bloquejada → factura total en esborrany; comptabilització manual. Vegeu `docs/SALES_ORDER_INVOICE_FLOW_IMPLEMENTED_2026-10-20.md` i el punt de represa adjacent. Bestretes, parcials, rectificatives i cancel·lacions d’acceptats pendents de definir.
- La versió PREUS 23/09/2026 només consta creada a proves; la promoció a principal continua pendent.

## Entorns i evidència

Els noms de bases dels documents són l'últim estat conegut, no una comprovació d'accés actual. Les còpies de proves caduquen. Configura `ODOO_ENV_FILE`, comprova la base en lectura i prova els canvis a la còpia neutralitzada vigent. Abans d'escriure a principal cal autorització per al canvi concret, prova, preview i rollback. No reutilitzis una aprovació de desplegament històrica.

Les auditories datades són històriques. No presentar-les com a observacions noves. No marcar una tasca com a completada només perquè existeixi codi. Actualitza TODO, README i el punt de represa quan canviïn decisions o estat, citant l'evidència i la data. No dependre de l'historial del xat per preservar decisions.

## Fitxers i comprovacions

El codi de les eines de setembre recuperat de tmp és a `scripts/archive/2026-09-23/`; llegeix-ne el README abans d'utilitzar-lo. Alguns plans intermedis estan superats per la jerarquia final de 31 subfamílies.

No versionar claus, `.env`, contactes, factures, pressupostos ni outputs privats. `MNL_SENSITIVE_DATA_DIR` apunta fora del repo. El clone conté el context funcional, però l'accés Odoo i les dades locals es recuperen per un canal privat.

Comprovacions locals: `npm run check`, `npm run catalog:combinations`, `npm run catalog:quote`. Per Python: entorn virtual i `requirements.txt`. Cap comprovació d'aquest tipus requereix escriure a Odoo.

Decisió posterior de facturació: una comanda → diverses factures, cada factura → una sola comanda. Adaptació de les regles de factura total/agrupada pendent; l’exemple antic agrupat no és el model futur aprovat.

Numeració obligatòria ja definida: pressupost MNL-YY·NNNN-A; la comanda conserva la versió acceptada. Compres i factures mantenen les seves seqüències natives. No forçar noms MNL-QA als documents de prova: marcar les proves a notes i usar default_get localitzat si cal copiar. Paleta: pressupost blau original, comanda verd, compra ambre, factura violeta. Vegeu `docs/DOCUMENT_IDENTITY_2026-10-21.md`.
