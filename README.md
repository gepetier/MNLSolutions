# MNL Odoo Sync

Aplicació interna per preparar i sincronitzar amb Odoo el catàleg de panells, els contactes i la configuració inicial de pressupostos.

## Desenvolupar des d'un clone

Segueix [la guia d'instal·lació](docs/DEVELOPMENT_SETUP.md) per instal·lar dependències i arrencar en una altra màquina. El [punt de represa del 14/10/2026](docs/DEVELOPMENT_HANDOFF_2026-10-14.md) resumeix l'estat i la feina pendent.

**Context compartit:** [AGENTS.md](AGENTS.md) indica l’ordre de lectura per reprendre el treball; [l’índex de context](docs/CONTEXT_INDEX.md) diferencia decisions vigents i auditories històriques.

## Estat del projecte

L'abast vigent de la fase 1 és:

1. Productes.
2. Clients.
3. Pressupostatge.

Compres, RFQ, inventari, entregues, facturació real, costos/marges/proveïdors genèrics, revisions A/B/C i annexos tècnics queden fora de la fase inicial. `Portes` és l'excepció aprovada: disposa d'un flux dedicat de proveïdor, cost, preu i marge.

El catàleg actual genera **5.220 variants natives** a partir de 87 productes base, 5 combinacions de chapa i 12 recobriments. A 29 de juliol de 2026, les 5.220 variants coincideixen exactament amb les bases de proves i principal.

Documents de govern:

- `docs/01_Estructura_Base_Odoo_MNL.md`: estructura funcional original.
- `docs/02_Handoff_Codex_Odoo_MNL_Fase1.md`: decisions posteriors; preval quan corregeix el document 01.
- `TODO.md`: estat i ordre de treball.
- `docs/TODO_AUDIT_2026-07-29.md`: auditoria dels 79 punts del TODO.
- `docs/ENVIRONMENTS.md`: entorns i protocol de canvis.
- `docs/tarifa-huurre-master.md`: referència de preus del catàleg.
- `docs/PRICE_VERSION_PREUS_2026-09-23.md`: versió congelada a Odoo de proves.

## Entorns Odoo

| Rol | Base | Configuració local |
| --- | --- | --- |
| Proves | `provesmnl202609` | `112.env` |
| Principal | `mnl-technical-consultant` | `BDprincipal.env` |

Tots els desenvolupaments i migracions s'han de provar primer a `provesmnl202609`. No s'ha d'escriure a la base principal sense una prova aprovada, preview i rollback. Les còpies de proves d'Odoo Online caduquen; quan es renovi la còpia, cal actualitzar `112.env`.

Els fitxers `*.env` estan ignorats per Git perquè contenen credencials. Per seleccionar explícitament proves a PowerShell:

```powershell
$env:ODOO_ENV_FILE = "112.env"
npm run odoo:ping
```

Consulta `docs/ENVIRONMENTS.md` abans d'executar operacions d'escriptura.

## Configuració

1. Crea una API key a Odoo per a l'usuari d'integració.
2. Copia `.env.example` a un fitxer local `.env` o a un fitxer específic d'entorn.
3. Configura:

```env
ODOO_URL=https://la-teva-empresa.odoo.com
ODOO_DB=nom_base_de_dades
ODOO_USERNAME=usuari@empresa.com
ODOO_API_KEY=...
MNL_SENSITIVE_DATA_DIR=C:\ruta\privada\MNLSolutions-private-data
```

L'usuari necessita permisos sobre productes, contactes, vendes, categories, atributs i variants.

## Dades sensibles

Els contactes, pressupostos, factures i altres dades de clients no poden guardar-se al repositori.

Ubicació compartida històrica:

```text
Z:\Adri\Dades MNLSolutions
```

Ubicació privada local preparada en aquest equip:

```text
C:\Users\34605\Documents\MNLSolutions-private-data
```

Selecciona la ubicació amb `MNL_SENSITIVE_DATA_DIR`. No versionis mai fitxers `.env`, claus API o JSON de clients.

## Comandes principals

```bash
npm run check
npm run odoo:ping
npm run catalog:combinations
npm run odoo:preview
npm run odoo:dry-run
npm run odoo:sync
npm run odoo:quote
```

`odoo:preview` compara el catàleg local amb `product.product` per SKU sense escriure canvis.

`odoo:dry-run` prepara el pla de sincronització sense aplicar-lo.

`odoo:sync` crea o actualitza:

- Categories `Panells / Coberta` i `Panells / Façana`.
- Una plantilla per cada combinació `panell + nucli`.
- Atributs `Gruix`, `Chapa` i `Recobriment`.
- Una variant per combinació final, amb SKU propi.
- Preus mitjançant `price_extra`: gruix com a preu base i chapa/recobriment com a ajustos.
- Unitat `m²` quan està disponible a Odoo.

Si un SKU pertany a un producte antic, la sincronització s'atura per evitar duplicats.

Cada sincronització genera un pla de rollback a `logs/`. El rollback arxiva les plantilles creades, però no elimina categories ni atributs compartits.

## Portes

Restaurat a `provesmnl202609` el 16/09 i promogut a principal el 23/09/2026, el checkbox `Portes` és sota la taula de línies. En activar-lo es poden seleccionar proveïdor, zona, combinat, grua, hores, vehicle i impostos d'Odoo. `Aplicar / actualitzar Portes` crea o actualitza una sola línia amb la descripció `Portes`.

La configuració de tarifes és a `Vendes > Configuració > Proveïdors de transport`. Els dos registres inicials són exemples i els seus imports s'han de substituir quan es disposi de tarifes reals.

```bash
npm run odoo:transport:inspect
npm run odoo:transport:install
```

L'instal·lador només accepta bases de proves amb el patró `provesmnl` seguit de dígits i rebutja la principal.

## Formes de pagament autoritzades

Restaurada a `provesmnl202609` i promoguda a principal el 23/09/2026, **Forma de pagament** reutilitza directament els camps i terminis natius d'Odoo (`property_payment_term_id` al client i `payment_term_id` al pressupost/comanda). Només s'ofereixen els tres terminis actius configurats per gerència: `Transferència Bancaria`, `Rebut bancari 30 dies` i `Confirming 60 dies`. El pressupost hereta el valor del client i permet canviar-lo sense modificar la fitxa del client. No hi ha cap model personalitzat intermedi.

```bash
npm run odoo:payment-methods:inspect
npm run odoo:payment-methods:install
```

L'instal·lador reutilitza exclusivament les tres condicions natives existents, elimina qualsevol capa personalitzada anterior i només accepta bases de proves amb el patró `provesmnl` seguit de dígits.

## Contactes des de documents

L'extractor llegeix pressupostos o factures Excel i genera el fitxer de contactes consumit per l'aplicació.

```bash
npm run contacts:invoices -- "C:\ruta\a\factures"
```

Per a una prova, indica una sortida privada explícita:

```bash
npm run contacts:invoices -- "C:\ruta\a\factures" --output "C:\ruta\privada\contacts.json"
```

Abans d'importar cal revisar els registres sospitosos, executar el preview contra l'entorn correcte i confirmar les altes. L'extracció auditada conté 345 registres: 342 contactes vàlids es van carregar i verificar el 23/09/2026 tant a `provesmnl202609` com a `mnl-technical-consultant`; els altres 3 eren errors d'extracció i es van excloure. Vegeu [el registre de la importació](docs/CONTACTS_IMPORT_2026-09-23.md).

## Pressupost de prova

`examples/odoo-quote.sample.json` permet crear una comanda de venda de prova que busca la variant exacta per SKU:

```bash
npm run odoo:quote
```

Utilitza aquesta ordre només a l'entorn de proves.

## Aplicació local

```bash
npm run dev
```

URL:

```text
http://localhost:4173
```

La pantalla inclou catàleg, generació de variants, càlcul de línies, preview d'Odoo i revisió de contactes. Per carregar contactes, `MNL_SENSITIVE_DATA_DIR` ha d'apuntar a una carpeta disponible amb `contacts.json`.

## Dades del client al pressupost (19/10/2026)

Corregida a `provesmnl1410` l’herència en viu de contacte, idioma i pagament en canviar de client. El formulari incorpora dades fiscals relacionades i contacte editable. Regressió RPC sense desar verificada; validació visual i desament pendents. Vegeu [el registre tècnic](docs/CUSTOMER_ONCHANGE_2026-10-19.md).

## Descomptes ajornats (19/10/2026)

Per decisió de l’usuari, els descomptes queden en standby. Els controls s’han ocultat al formulari de pressupostos de proves, conservant dades i dependències. Vegeu [el registre i la reversió](docs/DISCOUNTS_STANDBY_2026-10-19.md).

## Interfície del pressupost — 19/10/2026

Aplicat a `provesmnl1410`: amplada completa per defecte amb botó per mostrar/amagar l’espai lateral i preferència al navegador; targeta de client amb etiquetes alineades. Vista combinada CA/ES/EN, regressió RPC de client i botó verificats al navegador. Comprovació visual a 1363 px; pendent pantalla gran de l’usuari. Detall i reversió: `docs/QUOTATION_LAYOUT_2026-10-19.md`. Publicat a GitHub el 20/10/2026 amb autorització explícita de l’usuari (PR #1).

## PDF predeterminat de pressupost (19/10/2026)

`Pressupost MNL` segueix les files i les dotze columnes de la finestra, amb A4 vertical (actualització 20/10), sense marges ni descripcions de producte. Instal·lat i activat a proves; font QWeb i instal·lació reversible versionades. Vegeu [el mapa de camps i les proves](docs/QUOTATION_STANDARD_2026-10-19.md).

## Pressupost de treball (20/10/2026)

Eliminats els documents antics de proves per autorització de l’usuari. Hi ha un únic pressupost de treball amb dades fictícies i casos m²/ml/UDS/transport. Vegeu [els casos i les comprovacions](docs/WORKING_QUOTATION_2026-10-20.md), inclosa la diferència d’arrodoniment global de l’IVA.

El [banc de proves del 20/10](docs/QUOTATION_TEST_BENCH_2026-10-20.md) contrasta canvis reals d’interfície, persistència i 12 PDF. Inclou les incidències pendents del contacte, del portal, de les dates manuals i de les dimensions incompletes. Eines: `scripts/snapshot_odoo_quotation_readonly.js` i `scripts/check_quotation_coherence.py`.

## Correccions de coherència — 20/10/2026

Aplicades a proves: contacte manual conservat en canviar client i contacte en el mateix desament; portal i PDF amb document compartit; validesa bidireccional entre camp i condicions; dimensions obligatòries en generar documents m²/ml, amb excepció UDS. Validació i límits: [QUOTATION_UNIFIED_2026-10-20.md](docs/QUOTATION_UNIFIED_2026-10-20.md). Pressupost restaurat; principal sense canvis.

## Revisió visual posterior — 20/10/2026

Total variant amagat: onze columnes externes. Dimensions amb unitat m, lletra ampliada, resum fiscal natiu amb tipus i correccions de català. Separació de variants i SKU en prova provisional, pendents del vistiplau visual de l’usuari. Signatura en línia nativa activada al pressupost de mostra; no s’ha signat. IBAN i arrodoniment ajornats. Detall i evidència: `docs/QUOTATION_READABILITY_2026-10-20.md`. Aquesta decisió supera les referències anteriors a dotze columnes visibles.

## V3 de prova — 20/10/2026

PDF alternatiu de nou columnes, sense Class./Article repetits en les continuacions d’una variant, sense codis SKU ni imports amb IVA per fila, amb capçaleres en una línia, padding i fons suau. La v2 continua predeterminada; la v3 està pendent de valoració. Font, generació temporal i comprovacions a `docs/QUOTATION_V3_TRIAL_2026-10-20.md`.

## Terminologia de transport — 20/10/2026

«Portes» passa a «Transport» en català als noms visibles del producte i controls del pressupost de proves. Es conserven SKU/camps tècnics i càlculs. Les referències funcionals antigues a Portes descriuen el mateix mòdul de transport. Reproducció i reversió a `docs/TRANSPORT_LABEL_2026-10-20.md`.

## Anàlisi de fase següent — 20/10/2026

L’usuari demana analitzar Pressupost → Comanda → Factura. Auditoria en lectura de proves, sense confirmar, crear ni comptabilitzar documents: `docs/SALES_ORDER_INVOICE_FLOW_AUDIT_2026-10-20.md`. Base nativa existent, facturació per quantitats demanades, bloqueig automàtic desactivat, sense camps dimensionals a factura i sense document de comanda MNL consolidat. Només anàlisi/planificació autoritzades en aquesta petició; la implementació i les operacions comptables continuen pendents.


## Actualització del flux comercial — 20/10/2026

Implementat i provat només a proves: pressupost acceptat congelat amb PDF, comanda bloquejada, factura total en esborrany i traçabilitat de totes les revisions. Dates d’emissió i confirmació separades. La comptabilització continua manual; principal no modificada. Vegeu [registre d’implementació](docs/SALES_ORDER_INVOICE_FLOW_IMPLEMENTED_2026-10-20.md). Pendents: prova de signatura real pel portal, altres idiomes de factura i definició de parcials/rectificatives/cancel·lacions.


### Interfície de factura revisada — 20/10/2026

Aplicada a proves: títols de secció amb origen recuperats, article ampli, columnes ordenades, dimensions no aplicables amb guió i lateral plegable. Línies acceptades de només lectura al formulari. Sense canviar dades comercials ni comptabilitzar. Vegeu docs/INVOICE_INTERFACE_2026-10-20.md.


## Compres automàtiques en esborrany — 21/10/2026

Implementat i provat només a proves: producte de venda nou amb proveïdor natiu obligatori; confirmació genera una RFQ per proveïdor i comanda, amb dimensions i vincles natius. Sense confirmar ni enviar compres. Els productes antics sense proveïdor queden bloquejats en confirmar fins que es configurin; no s’han inventat dades. Vegeu docs/PURCHASE_FLOW_2026-10-21.md.

Decisió de factura vigent: una comanda pot generar diverses factures, però cada factura prové d’una sola comanda. L’adaptació del flux anterior de factura total/agrupada continua pendent; no confondre-la amb el flux de compres ja provat.
