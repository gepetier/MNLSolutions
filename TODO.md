# TODO — Odoo MNL

**Actualització documental:** 14 d’octubre de 2026
**Últimes evidències Odoo incorporades:** 23 de setembre de 2026 (sense nova auditoria Odoo el 14/10)
**Abast vigent:** productes, clients i pressupostatge
**Mestres funcionals:**

1. `docs/01_Estructura_Base_Odoo_MNL.md`
2. `docs/02_Handoff_Codex_Odoo_MNL_Fase1.md`

El document `01` defineix l'estructura base. El document `02` conté decisions posteriors i preval quan corregeix o concreta el `01`. `docs/tarifa-huurre-master.md` és una font de preus del catàleg, no un tercer mestre funcional.

**Auditoria punt per punt:** `docs/TODO_AUDIT_2026-07-29.md`. Els identificadors T001–T079 segueixen l'ordre de les caselles d'aquest fitxer. L'auditoria separa decisió confirmada, codi existent, dades reals i validació funcional. És una fotografia de juliol: els registres de setembre i les actualitzacions datades d'aquest TODO prevalen sobre el seu estat històric. Vegeu `docs/CONTEXT_INDEX.md`.

## Llegenda

- `[x] CONFIRMAT/FET`: decisió confirmada o resultat validat amb evidència.
- `[-] PARCIAL`: hi ha implementació, però falta validar-la o completar-la.
- `[ ] PENDENT`: encara no implementat o no demostrat.
- `[!] BLOQUEJAT`: necessita una decisió, accés o prova externa.
- `[~] FORA D'ABAST`: ajornat expressament.

## 0. Decisions de prevalença entre els mestres

- [x] **Adreça d'entrega al pressupost:** aplicar `02`. No hi haurà camp d'entrega/obra ni bloc `ENVIO` al pressupost o al seu PDF. La previsió contrària de `01` queda superada.
- [x] **Cost, marge i proveïdor:** la lògica genèrica de productes continua ajornada. Excepció aprovada el 29/07/2026: `Portes` té proveïdor, cost i marge propis mitjançant el model dedicat de transport.
- [x] **Preus de variants:** conservar el mecanisme natiu `price_extra → lst_price → price_unit` auditat a Odoo.
- [x] **Validesa:** usar `validity_date` i el valor per defecte configurat nativament a Odoo. Les automatitzacions MNL que forçaven 30 dies han quedat desactivades a proves i a principal segons `docs/PRODUCTION_PROMOTION_2026-09-23.md`.
- [x] **Forma de pagament:** reutilitzar directament `account.payment.term`, `property_payment_term_id` i `payment_term_id`, sense model personalitzat. Només es mostren Transferència Bancaria, Rebut bancari 30 dies i Confirming 60 dies; el valor s'hereta del client i es conserva al pressupost/comanda.
- [x] **Agrupació:** mateixa variant exacta significa la mateixa agrupació. El classificador és només visual i no governa l'agrupació.
- [x] **Revisions:** en fase 1 només revisió `A`; el flux `A → B → C` queda ajornat.

## 1. Prioritat immediata — PDF de pressupost fase 1

- [-] **Escollir i consolidar una única plantilla.** Les quatre accions estan vinculades a `sale.order` a proves (16/09) i principal (23/09), segons els registres de recuperació i promoció. Falta escollir una única plantilla i validar visualment la definitiva; no cal repetir la restauració de vinculacions.
  - Evidència vigent: `docs/RESTART_AUDIT_2026-09-16.md` i `docs/PRODUCTION_PROMOTION_2026-09-23.md`.
  - Evidència: `logs/odoo-quote-templates-install-provesmnl111-2026-07-08T17-13-38-583Z.json`.
  - Evidència: `logs/odoo-quote-template-action-test-provesmnl111-2026-07-08T17-15-54-708Z.json`.
- [!] **Generar i revisar visualment un PDF real des de la interfície d'Odoo.** La crida remota a `_render_qweb_pdf` està bloquejada perquè és un mètode privat; això no demostra que la impressió manual falli.
- [ ] **Documentar el mapa definitiu camp Odoo → dada PDF** abans de modificar la plantilla.
- [ ] **Eliminar qualsevol bloc d'entrega/obra/`ENVIO`** de la plantilla definitiva.
- [ ] **Implementar la capçalera definitiva:** MNL a l'esquerra i client a la dreta.
- [-] **Implementar el títol multidioma del client:** les QWeb ja tenen diccionaris CA/ES/EN, però falta validar visualment el bloc complet.
- [ ] **Mantenir sempre les etiquetes del client**, encara que el valor estigui buit: nom, adreça fiscal, NIF/CIF, telèfon, correu i persona de contacte.
- [-] **Implementar la persona de contacte separada i editable:** els camps i l'herència existeixen, però el PDF no referencia directament el contacte del pressupost.
- [-] **Implementar la taula definitiva:** la plantilla D té l'estructura visual aproximada, però no usa encara els camps dimensionals Studio definits.
- [ ] **Mostrar dimensions, quantitats, preus i imports amb dos decimals.** Quan `LONG.` o `ANCHO` no siguin aplicables, mostrar `-`.
- [ ] **Agrupar visualment les mides d'una mateixa variant exacta** i mostrar-ne el total de producte.
- [-] **Afegir subtotals per família/capítol:** existeixen seccions i automatitzacions de família, però l'ús de dades i el PDF són incomplets.
- [x] **Mostrar sempre la forma de pagament:** implementada a `provesmnl112` i validada al navegador sobre el pressupost `MNL-26·0020-A`; l'informe mostra `FORMA DE PAGAMENT: Transferència bancària`.
- [ ] **Mostrar dades bancàries només per pagament per transferència.**
- [ ] **Mostrar sempre el bloc d'acceptació i signatura.**
- [-] **Mantenir `Distribuidor Oficial` i `www.induspanel.es`:** Induspanel només està acreditat a la plantilla D i la URL definitiva no està validada.
- [x] **No generar annexos tècnics automàtics** en aquesta fase; la inicialització elimina documents del Quote Builder.
- [ ] **Provar la plantilla amb casos m², ML i UDS**, dades de client incompletes, empresa amb contacte i empresa sense contacte.

## 2. Decisions funcionals pendents del pressupost

- [x] **PORTES condicional:** checkbox sota la taula de línies; la configuració només apareix quan s'activa i crea una única línia amb el text `Portes`.
- [x] **PORTES amb import:** no és una línia només informativa. Calcula cost de proveïdor, preu a client i marge segons proveïdor, zona i casuística.
- [x] **Resum econòmic:** el PDF mostrarà subtotals per família/capítol, base imposable, IVA i total, d'acord amb `docs/01_Estructura_Base_Odoo_MNL.md`.
- [x] **Impostos:** seleccionar-los de la llista nativa d'Odoo. El producte intern `Portes` proposa `21% S`, editable al pressupost.
- [x] **Presentació dels descomptes:** es representaran com una línia més a la taula del pressupost; no cal repetir-los com a partida separada al resum final.
- [-] **Implementació dels descomptes:** el menú natiu actual modifica línies concretes; falta adaptar o substituir el flux perquè generi i mostri la línia de descompte al PDF.
- [x] **Família i numeració:** usar la nomenclatura i l'estructura de categories d'Odoo; ordenar les línies per família/capítol amb subtotal i reiniciar la numeració a `.01` a cada capítol (`1.01`, `2.01`, etc.).
- [x] **Responsable intern:** usar el comercial assignat nativament a Odoo (`sale.order.user_id`), sense un camp MNL separat.
- [x] **Idioma del pressupost:** documentació inicial en castellà, català i anglès; s'hereta per defecte de l'idioma del client i es pot modificar manualment des del desplegable existent, segons `docs/01_Estructura_Base_Odoo_MNL.md`.
- [-] **Validació d'idiomes:** comprovar el flux complet CA/ES/EN i activar l'anglès a Odoo si cal; l'auditoria del 29/07 només trobava català i castellà actius com a idiomes de contacte.
- [-] **Textos comercials:** hi ha diccionaris CA/ES/EN a les QWeb, pendents de revisió i aprovació.
- [x] **Numeració visible:** usar el punt volat segons el format `MNL-YY·NNNN-A` (per exemple, `MNL-26·0020-A`); fase inicial amb revisió `A`.

## 3. Productes i catàleg

- [x] **Catàleg local estructurat** per panell, nucli, gruix, chapa i recobriment a `data/catalog.json`.
- [x] **Càlcul de combinacions i SKU** implementat al motor local.
- [x] **Preview, dry-run, sincronització i rollback** de productes implementats a `src/odooSync.js` i `src/cli.js`.
- [x] **Categories inicials** definides com `Panells / Coberta` i `Panells / Façana`.
- [x] **Variants natives d'Odoo** definides amb atributs `Gruix`, `Chapa` i `Recobriment`.
- [x] **Auditoria de pricing** feta sense modificar la lògica nativa.
- [x] **Sincronització real del catàleg validada en lectura:** principal i `provesmnl112` coincideixen exactament amb les 5.220 variants locals; 0 altes, 0 actualitzacions i 0 sobrants a 29/07/2026.
- [x] **Catàleg validat contra `docs/tarifa-huurre-master.md`:** coincideixen 39 preus base, 5 ajustos de chapa, 3 extres i 11 recobriments (`scripts/audit_catalog_tariff.js`).
- [-] **Descripció comercial pròpia de cada variant:** les 5.220 variants tenen `description_sale` i `x_studio_descripcio_comercial`, però cap línia llegible la tenia copiada i el PDF no la referencia directament.
- [-] **Completar famílies no cobertes pel catàleg actual:** categories documentades i alineades el 23/09 (13 famílies classificades, 31 subfamílies, 48 categories totals); això no significa que els productes i tarifes de remats, cargoleria o canalons estiguin creats. Evidència: `docs/PRODUCT_FAMILIES_2026-09-23.md` i `docs/PRODUCT_SUBFAMILIES_2026-09-23.md`.
- [-] **Validar unitats de mesura:** Odoo té `m²`, `ml`, `m` i `Units`, i els panells usen `m²`; falta provar ML/UDS de cap a cap.
- [ ] **Definir el flux de producte especial creat des del pressupost** i comprovar que queda actiu i disponible per a tots els usuaris.

## 4. Càlcul dimensional i automatitzacions

- [x] **Camps Studio auditats:** `x_studio_uds`, `x_studio_long`, `x_studio_ancho_1`, `x_studio_cantidad`, `x_studio_total` i `x_studio_classificador`.
- [-] **Automatització m² auditada:** la fórmula existeix i funciona en mostres de proves, però hi ha línies històriques incoherents a principal.
- [-] **Còpia inicial de quantitat a UDS:** l'automatització existeix, però hi ha línies UDS històriques no normalitzades.
- [-] **Assignació i ordenació del classificador:** automatitzacions actives; cobertura actual 4/4 línies a proves i 21/31 a principal.
- [-] **Càlcul ML i UDS:** el model local els contempla, però falta demostrar el flux complet a les línies d'Odoo i al PDF.
- [-] **Prova de regressió de les automatitzacions:** recuperació del pipeline i proves UDS/m² el 16/09; regressió web de panell, transport, seccions i pagaments el 23/09 a proves. Persisteix el problema de mides invisibles a la fitxa estreta; ML amb producte comercial i regressió completa de principal continuen pendents. Evidència: `docs/RESTART_AUDIT_2026-09-16.md`.
- [x] **Font d'UDS resolta:** `x_studio_uds` és l'entrada d'unitats i `product_uom_qty` és la quantitat calculada d'Odoo.

## 5. Clients i contactes

- [x] **Extractor de contactes des de pressupostos i factures Excel** implementat.
- [x] **Última extracció de factures:** 711 fitxers escanejats, 345 contactes consolidats i 0 errors de lectura.
- [x] **Pantalla local de revisió, cerca, filtres i exportació** de contactes implementada.
- [x] **Preview contra Odoo i creació selectiva de contactes nous** implementats al codi.
- [x] **Importació a Odoo verificada el 23/09/2026:** 342 contactes vàlids carregats i identificats a `provesmnl202609` i `mnl-technical-consultant`; 3 errors d'extracció exclosos. Vegeu `docs/CONTACTS_IMPORT_2026-09-23.md`.
- [-] **Qualitat dels contactes:** no hi ha NIF ni noms normalitzats duplicats en el lot de 342, però cal revisar més endavant els camps incomplets, els noms equivalents i les adreces.
- [-] **Tipus de client:** el camp i les tres opcions existeixen, però gairebé tots els contactes el tenen buit.
- [-] **Estat comercial:** el camp i els quatre estats existeixen, però gairebé tots els contactes el tenen buit.
- [-] **Bloquejar pressupostos de clients bloquejats:** automatització activa i codi coherent; falta prova funcional dels matisos d'esborrany i enviament.
- [-] **Diversos contactes i contacte principal:** estructura, camps i herència existeixen, però l'ús real encara és limitat.
- [x] **NIF/DNI/CIF no obligatori:** verificat a l'esquema d'Odoo i en contactes sense NIF.
- [~] **Exigir NIF abans de facturar** queda fora de la fase inicial de pressupostatge.

## 6. Aplicació local i qualitat tècnica

- [x] **Aplicació local:** servidor, catàleg i pantalla de contactes funcionen; les dades sensibles es carreguen des de la ruta externa indicada per `MNL_SENSITIVE_DATA_DIR`.
- [x] **Validació sintàctica:** `npm run check` cobreix tot el JavaScript de src/scripts/electron/public; la sintaxi Python també s'ha verificat el 14/10/2026. El clone net del checkpoint passa el recompte de 5.220 variants i el càlcul local de l'exemple.
- [ ] **Afegir proves automatitzades** per a catàleg, càlculs, deduplicació de contactes i construcció de payloads Odoo.
- [ ] **Corregir problemes de codificació a les dades:** les fonts són majoritàriament UTF-8, però l'extracció conserva casos com `1Âª`.
- [x] **Control de versions restaurat:** recuperats l'historial Git de tres commits i el remot original sense sobreescriure els fitxers de treball.
- [x] **Mestre `01` incorporat a `docs/`** com `docs/01_Estructura_Base_Odoo_MNL.md`; aquest TODO ja no depèn de `Downloads`.
- [x] **Dades personals temporals reubicades fora del repositori:** `tmp-invoice-contacts.json` s'ha mogut a `C:\Users\34605\Documents\MNLSolutions-private-data\contacts.json`, i les rutes sensibles estan ignorades per Git.
- [x] **README actualitzat** amb l'estat real de 5.220 variants, els entorns Odoo, el flux segur de proves i la política de dades sensibles.

## 7. Feina executada fora de l'abast inicial

- [-] **Plantilla de factura `kawabunga`:** instal·lada a `provesmnl112`, amb acció d'informe funcional, però la prova de render va retornar `Access Denied`.
- [~] **No continuar la factura** fins que es decideixi explícitament prioritzar-la per davant del pressupost fase 1.
- [~] **Compres, RFQ, inventari, recepcions, entregues i facturació real** queden fora de fase.
- [!] **Cost real, marge objectiu/real i proveïdor genèrics continuen ajornats:** l'única excepció aprovada és la línia dedicada `Portes`; els camps comercials genèrics i l'acció manual anterior continuen sent un risc separat.
- [!] **Revisions comercials A/B/C estan ajornades, però ja existeix una revisió B i automatitzacions compatibles amb lletres.** Línies opcionals i annexos automàtics continuen fora de fase.

## 8. Ordre de treball recomanat (actualitzat el 14/10/2026)

1. Configurar el nou equip amb `docs/DEVELOPMENT_SETUP.md` i verificar en lectura la base de proves disponible.
2. Auditar les contradiccions actives d'enviament/obra, cost-marge-proveïdor i revisions B/C; no assumir que la promoció les va resoldre totes.
3. Escollir una de les quatre plantilles ja vinculades i revisar un PDF real des de la interfície.
4. Consolidar el PDF fase 1 segons el mestre `02`: client, dimensions, agrupacions, subtotals, descomptes, pagament i firma.
5. Completar la regressió de ML/UDS, la fitxa estreta de dimensions, el bloqueig de client i la revisió després del desplegament a principal.
6. Configurar proveïdors reals de transport a principal; els dos exemples es van ometre expressament.
7. Validar `PREUS 23/09/2026` a proves i demanar autorització concreta abans de promoure-la a principal.
8. Completar tipus/estat/contacte principal i la qualitat dels contactes ja carregats. Facturació i fases futures continuen ajornades.

## 9. Criteri per actualitzar aquest fitxer

Cada canvi d'estat ha d'incloure una evidència verificable: fitxer i línia, prova automatitzada, log d'Odoo, captura/PDF revisat o decisió funcional datada. No marcar una tasca com a `FET` només perquè existeixi codi; també ha d'estar validada en l'entorn corresponent.

## Actualització 19/10/2026 — selecció de client

- [x] Herència en viu de contacte, idioma i pagament a `provesmnl1410`, amb dades fiscals relacionades visibles al formulari. Quatre casos RPC verificats i vista combinada comprovada. Evidència: `docs/CUSTOMER_ONCHANGE_2026-10-19.md`.
- [ ] Validar visualment al navegador autenticat i el desament del pressupost després de seleccionar/canviar client; mantenir separada aquesta comprovació de la regressió RPC.
- [ ] Recuperar a Git les personalitzacions de marges/descomptes del 14/10; aquesta correcció no les substitueix.

## Decisió 19/10/2026 — descomptes en standby

- [~] Descomptes ajornats per instrucció de l’usuari; la seva implementació i validació deixen de ser prioritats vigents.
- [x] Ocultació dels controls de descompte del formulari de pressupost a proves, amb verificació de l’arquitectura combinada. Evidència i reversió: `docs/DISCOUNTS_STANDBY_2026-10-19.md`.
- [ ] Confirmació visual després de recarregar la interfície autenticada.

## Interfície del pressupost — 19/10/2026

Aplicat a `provesmnl1410`: amplada completa per defecte amb botó per mostrar/amagar l’espai lateral i preferència al navegador; targeta de client amb etiquetes alineades. Vista combinada CA/ES/EN, regressió RPC de client i botó verificats al navegador. Comprovació visual a 1363 px; pendent pantalla gran de l’usuari. Detall i reversió: `docs/QUOTATION_LAYOUT_2026-10-19.md`. Publicat a GitHub el 20/10/2026 amb autorització explícita de l’usuari (PR #1).

## Decisió 19/10/2026 — PDF estàndard

- [x] Plantilla predeterminada `Pressupost MNL` activada a `provesmnl1410`, amb les mateixes files i columnes del formulari, sense marges ni descripcions. Supera la tria pendent entre A–D i el model de sublínies del PDF antic.
- [x] PDF real de mostra revisat visualment i files/imports contrastats amb la BD. Evidència: `docs/QUOTATION_STANDARD_2026-10-19.md`.
- [ ] Prova directa del botó Imprimir al navegador autenticat i ampliació de casos ML/multipàgina/idiomes.

## Actualització 20/10/2026 — pressupost en vertical

- [x] Plantilla predeterminada a proves canviada a A4 vertical, mantenint les dotze columnes, sense marges ni descripcions de producte. Vegeu `docs/QUOTATION_STANDARD_2026-10-19.md`.

## Actualització 20/10/2026 — pressupost únic de treball

- [x] Eliminats els 20 documents de proves anteriors amb autorització de l’usuari. Conservada la factura vinculada. Creat un únic esborrany amb casos m²/ml/UDS i transport; vegeu `docs/WORKING_QUOTATION_2026-10-20.md`.
- [ ] Acordar la representació de la diferència entre IVA global i suma d’imports amb IVA per fila. Fer les regressions posteriors sobre el pressupost únic.

## Banc de proves per interfície i PDF — 20/10/2026

- [x] Executats canvis de m²/ml/UDS, marges comercials existents, variant, transport, client/contacte, idioma, pagament, validesa, límits i eliminació/reposició de línia; 12 PDF contrastats amb la BD. Estat inicial restaurat. Evidència: `docs/QUOTATION_TEST_BENCH_2026-10-20.md`.
- [ ] **Corregir pèrdua del contacte manual** quan es canvia el client empresa i se selecciona el contacte abans del mateix desament (C19).
- [ ] Alinear el portal `Vista previa` amb les dades/contingut del PDF aprovat; ara mostra descripcions i resum natiu diferents.
- [ ] Detectar dates de validesa discordants dins textos manuals i dimensions incompletes abans de generar/enviar. No s’ha provat enviament.
- [ ] Completar comprovació de contingut de la descàrrega directa d’`Imprimir`: esdeveniment de descàrrega rebut, però fitxer no accessible per comparar-lo. Els renderitzats al servidor sí s’han verificat.

## Correccions de coherència — 20/10/2026

Aplicades a proves: contacte manual conservat en canviar client i contacte en el mateix desament; portal i PDF amb document compartit; validesa bidireccional entre camp i condicions; dimensions obligatòries en generar documents m²/ml, amb excepció UDS. Validació i límits: [QUOTATION_UNIFIED_2026-10-20.md](docs/QUOTATION_UNIFIED_2026-10-20.md). Pressupost restaurat; principal sense canvis.

## Revisió visual posterior — 20/10/2026

Total variant amagat: onze columnes externes. Dimensions amb unitat m, lletra ampliada, resum fiscal natiu amb tipus i correccions de català. Separació de variants i SKU en prova provisional, pendents del vistiplau visual de l’usuari. Signatura en línia nativa activada al pressupost de mostra; no s’ha signat. IBAN i arrodoniment ajornats. Detall i evidència: `docs/QUOTATION_READABILITY_2026-10-20.md`. Aquesta decisió supera les referències anteriors a dotze columnes visibles.
