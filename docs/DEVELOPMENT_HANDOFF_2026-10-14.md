# Punt de represa — 14/10/2026

Aquest checkpoint prepara la carpeta local per publicar-la amb els canvis pendents de setembre. No s'ha contactat Odoo ni executat cap migració durant aquesta preparació.

## Estat documentat

La fase vigent és productes, clients i pressupostatge. El catàleg local genera 5.220 variants. Els documents del 23/09 registren la importació de 342 contactes, les famílies/subfamílies i la promoció de pagaments, transport, quantitats, informes i nivell de risc a principal. Són evidències històriques; cal una auditoria nova abans de modificar Odoo.

Fonts de represa:

- `PRODUCTION_PROMOTION_2026-09-23.md`: què es va aplicar a principal i diferències pendents.
- `CONTACTS_IMPORT_2026-09-23.md`: importació de contactes.
- `PRODUCT_FAMILIES_2026-09-23.md` i `PRODUCT_SUBFAMILIES_2026-09-23.md`: classificació.
- `PRICE_VERSION_PREUS_2026-09-23.md`: versió congelada de preus a proves.
- `02_Handoff_Codex_Odoo_MNL_Fase1.md`: decisions funcionals.
- `TODO.md`: llista de feina; actualitzat el 14/10 amb els resultats de setembre; les comprovacions històriques conserven la seva data.

## Proper treball

1. Configurar la nova màquina amb `DEVELOPMENT_SETUP.md` i comprovar en lectura la còpia de proves vigent.
2. Verificar la regressió funcional des de la interfície i contrastar l’estat real amb la promoció del 23/09.
3. Consolidar una plantilla de pressupost i validar un PDF real, amb dimensions, agrupacions, subtotals, clients incomplets i idiomes CA/ES/EN.
4. Completar les proves de ML/UDS, descomptes i proveïdors reals de transport.
5. La promoció de `PREUS 23/09/2026` a principal continua pendent segons el registre; no assumir que ja està aplicada.

El script `prepare_historical_invoice_archive.py` prepara JSON a partir d'Excel; la facturació real continua fora de la fase inicial. No s'ha de confondre amb una migració comptable aprovada.

## Portabilitat

S'han declarat les dependències Python, ampliat `npm run check` a tot el JavaScript, substituït la dependència interna de Codex de l'inspector Excel i alineat els extractors amb `MNL_SENSITIVE_DATA_DIR`. S'han retirat de Git les memòries cau Python. La configuració Odoo, les dades privades i els backups de rollback es recuperen separadament.

## Context compartit entre equips

`AGENTS.md` a l’arrel indica la lectura inicial de Codex. `docs/CONTEXT_INDEX.md` agrupa totes les fonts i explica quins recursos privats s’han de recuperar. Les eines històriques abans ignorades a tmp són ara a `scripts/archive/2026-09-23/`; els plans intermedis no substitueixen les decisions finals de setembre.

## Seguiment 19/10/2026

Accés de lectura i correcció de client realitzats sobre `provesmnl1410`. El canvi de client ja retorna contacte, idioma, pagament i dades fiscals abans de desar en les proves RPC. Vegeu `CUSTOMER_ONCHANGE_2026-10-19.md`; queda pendent la verificació visual i el desament. Les novetats de marges/descomptes posteriors al checkpoint encara s’han de recuperar a Git.

Descomptes: ajornats per decisió de l’usuari el 19/10. Controls ocults al pressupostatge de proves; no reprendre’n el desenvolupament fins a nova instrucció. Vegeu `DISCOUNTS_STANDBY_2026-10-19.md`.

## Interfície del pressupost — 19/10/2026

Aplicat a `provesmnl1410`: amplada completa per defecte amb botó per mostrar/amagar l’espai lateral i preferència al navegador; targeta de client amb etiquetes alineades. Vista combinada CA/ES/EN, regressió RPC de client i botó verificats al navegador. Comprovació visual a 1363 px; pendent pantalla gran de l’usuari. Detall i reversió: `docs/QUOTATION_LAYOUT_2026-10-19.md`. Publicat a GitHub el 20/10/2026 amb autorització explícita de l’usuari (PR #1).

PDF: `Pressupost MNL` és la plantilla predeterminada a proves des del 19/10. Mateixes files/columnes que al formulari, sense marges ni descripcions; les propostes A–D deixen de sortir al menú. Vegeu `QUOTATION_STANDARD_2026-10-19.md`. No repetir la tria de plantilla antiga.

## Pressupost únic de treball — 20/10/2026

Per autorització de l’usuari, eliminats els 20 documents de proves anteriors; la factura vinculada es conserva. Treballar sobre l’únic pressupost en esborrany amb dades fictícies de `provesmnl1410`. Inclou m², ml, UDS, mides repetides i transport. Vegeu `WORKING_QUOTATION_2026-10-20.md`; pendent la representació de l’arrodoniment global de l’IVA. Principal sense canvis.

## Banc de proves — 20/10/2026

Executades modificacions reals per interfície i contrast de persistència/12 PDF; vegeu `QUOTATION_TEST_BENCH_2026-10-20.md`. Pressupost restaurat als valors de partida. Prioritat: contacte manual perdut quan es canvia client i contacte en el mateix desament. També pendents portal divergent, dates manuals i avís de línies incompletes. No confondre la pèrdua de contacte reproduïda amb les regressions RPC anteriors correctes. No hi ha correcció funcional aplicada durant el banc.

## Correccions de coherència — 20/10/2026

Aplicades a proves: contacte manual conservat en canviar client i contacte en el mateix desament; portal i PDF amb document compartit; validesa bidireccional entre camp i condicions; dimensions obligatòries en generar documents m²/ml, amb excepció UDS. Validació i límits: [QUOTATION_UNIFIED_2026-10-20.md](QUOTATION_UNIFIED_2026-10-20.md). Pressupost restaurat; principal sense canvis.

## Revisió visual posterior — 20/10/2026

Total variant amagat: onze columnes externes. Dimensions amb unitat m, lletra ampliada, resum fiscal natiu amb tipus i correccions de català. Separació de variants i SKU en prova provisional, pendents del vistiplau visual de l’usuari. Signatura en línia nativa activada al pressupost de mostra; no s’ha signat. IBAN i arrodoniment ajornats. Detall i evidència: `QUOTATION_READABILITY_2026-10-20.md`. Aquesta decisió supera les referències anteriors a dotze columnes visibles.

## V3 de prova — 20/10/2026

PDF alternatiu de nou columnes, sense Class./Article repetits en les continuacions d’una variant, sense codis SKU ni imports amb IVA per fila, amb capçaleres en una línia, padding i fons suau. La v2 continua predeterminada; la v3 està pendent de valoració. Font, generació temporal i comprovacions a `QUOTATION_V3_TRIAL_2026-10-20.md`.

## Terminologia de transport — 20/10/2026

«Portes» passa a «Transport» en català als noms visibles del producte i controls del pressupost de proves. Es conserven SKU/camps tècnics i càlculs. Les referències funcionals antigues a Portes descriuen el mateix mòdul de transport. Reproducció i reversió a `TRANSPORT_LABEL_2026-10-20.md`.

## Anàlisi de fase següent — 20/10/2026

L’usuari demana analitzar Pressupost → Comanda → Factura. Auditoria en lectura de proves, sense confirmar, crear ni comptabilitzar documents: `SALES_ORDER_INVOICE_FLOW_AUDIT_2026-10-20.md`. Base nativa existent, facturació per quantitats demanades, bloqueig automàtic desactivat, sense camps dimensionals a factura i sense document de comanda MNL consolidat. Només anàlisi/planificació autoritzades en aquesta petició; la implementació i les operacions comptables continuen pendents.


## Actualització del flux comercial — 20/10/2026

Implementat i provat només a proves: pressupost acceptat congelat amb PDF, comanda bloquejada, factura total en esborrany i traçabilitat de totes les revisions. Dates d’emissió i confirmació separades. La comptabilització continua manual; principal no modificada. Vegeu [registre d’implementació](SALES_ORDER_INVOICE_FLOW_IMPLEMENTED_2026-10-20.md). Pendents: prova de signatura real pel portal, altres idiomes de factura i definició de parcials/rectificatives/cancel·lacions.
