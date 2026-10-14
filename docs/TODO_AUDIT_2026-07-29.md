# Auditoria punt per punt del TODO — 29 de juliol de 2026

> Registre històric. Per l’estat de represa actual consulta [CONTEXT_INDEX.md](CONTEXT_INDEX.md), el TODO i la promoció del 23/09. No interpretar aquest diagnòstic datat com una lectura actual d’Odoo.


## Abast i mètode

S'han contrastat els 79 punts de `TODO.md` contra:

- `01_Estructura_Base_Odoo_MNL (1).md`.
- `02_Handoff_Codex_Odoo_MNL_Fase1.md`.
- Codi i dades locals.
- Logs locals d'Odoo.
- Consultes actuals, estrictament de lectura, a `provesmnl112` i `mnl-technical-consultant`.

No s'ha creat, modificat ni eliminat cap registre d'Odoo durant l'auditoria.

**Seguiment posterior:** el 29/07/2026 es van implementar a `provesmnl112` les decisions funcionals de Portes, impostos, descompte selectiu, validesa nativa i les tres formes de pagament autoritzades. Les files afectades s'han actualitzat amb aquesta evidència posterior; la base principal no s'ha modificat.

## Resultats generals

- Catàleg local: 5.220 combinacions.
- Catàleg Odoo: 5.220 coincidències exactes a cadascuna de les dues bases; 0 altes, 0 actualitzacions i 0 variants sobrants.
- Tarifa: coincideixen els 39 preus base documentats, 5 ajustos de chapa, 3 extres i 11 recobriments.
- Contactes de factures: 342 de 345 ja existeixen a `provesmnl112`; els 3 restants són registres sospitosos. A la base principal no n'hi ha cap dels 345.
- PDF: hi ha quatre QWeb, però cap no compleix encara tota la fase 1; la D conserva enviament i les quatre manquen del detall dimensional definitiu.
- Automatitzacions: existeixen moltes més peces que les documentades inicialment, però hi ha dades històriques incoherents i configuració diferent entre bases.

## Auditoria dels 79 punts

| ID | Estat auditat | Resultat i evidència |
| --- | --- | --- |
| T001 | Confirmat com a decisió; incomplert parcialment | El mestre `02` elimina entrega/obra del pressupost. Malgrat això, existeix `x_studio_adreca_obra_id`, la inicialització l'emplena i la plantilla D usa `partner_shipping_id`. |
| T002 | Confirmat amb excepció posterior | Cost, marge i proveïdor genèrics continuen ajornats. `Portes` té una lògica dedicada aprovada i implementada només a proves; l'acció comercial genèrica anterior continua sent un risc separat. |
| T003 | Confirmat | El codi usa `price_extra` i el preview actual troba les 5.220 variants sense diferències de preu. A proves existeixen ara dos proveïdors dedicats exclusivament a `Portes`; no alteren el pricing de variants. |
| T004 | Resolt a proves el 29/07/2026 | `validity_date` conserva el valor per defecte natiu d'Odoo. S'han desactivat les dues automatitzacions MNL que el recalculaven des de `x_studio_validesa_dies`, i el camp personalitzat queda ocult. |
| T005 | Confirmat com a decisió; implementació parcial | Les automatitzacions reutilitzen producte/classificador dins del capítol. No s'ha validat encara l'agrupació final al PDF. |
| T006 | Confirmat com a decisió; contradicció de dades | El `02` limita fase 1 a revisió A, però a la base principal existeix un pressupost amb revisió B i les automatitzacions accepten lletres successives. |
| T007 | Parcial i desactualitzat | Els logs acrediten quatre informes actius a `provesmnl111`. Avui `provesmnl112` té les quatre vistes QWeb però no les accions d'informe; la principal té quatre accions, però sense `binding_model_id`. No hi ha plantilla definitiva. |
| T008 | Confirmat | Els logs mostren que `_render_qweb_pdf` no es pot invocar remotament. No consta revisió visual manual d'un PDF actual. |
| T009 | Pendent confirmat | No existeix un mapa canònic camp Odoo → dada PDF. Hi ha camps i plantilles, però no un document de correspondència tancat. |
| T010 | Pendent confirmat; defecte localitzat | A–C no usen enviament, però D encara usa `partner_shipping_id`. |
| T011 | Pendent confirmat | Hi ha capçaleres diferents per plantilla, però cap plantilla ha estat escollida i validada com a definitiva. |
| T012 | Parcial | Les quatre QWeb contenen diccionaris català/castellà/anglès i `x_studio_idioma_document`, però no s'ha validat visualment el bloc client complet. |
| T013 | Pendent confirmat | Les QWeb no acrediten totes les etiquetes obligatòries ni els valors buits estables; manquen especialment correu i contacte al mapa de camps directe. |
| T014 | Parcial | Existeixen `x_studio_contacte_principal_id` i `x_studio_contacte_pressupost_id`, amb herència automàtica. Només hi ha dades de prova limitades i el PDF no referencia directament el camp. |
| T015 | Parcial insuficient | La plantilla D té estructura de vuit/nou columnes, però les QWeb actuals només referencien quantitat Odoo, preu i import; no els camps dimensionals Studio. |
| T016 | Pendent confirmat | No hi ha evidència de format homogeni a dos decimals ni de `-` per longitud/amplada no aplicables al PDF actual. |
| T017 | Pendent confirmat | Les QWeb recorren línies normals; no s'ha trobat una agrupació PDF completa de sublínies per variant amb total de producte. |
| T018 | Parcial | A la principal hi ha automatitzacions actives que creen/reordenen seccions per categoria i família. Només 4 de 31 línies llegibles tenen família informada i el PDF no està validat. |
| T019 | Resolt a proves el 29/07/2026 | La solució definitiva reutilitza directament `property_payment_term_id` i `payment_term_id`, relacionats amb `account.payment.term`, i restringeix les vistes als tres terminis natius configurats per gerència. La capa personalitzada inicial es va migrar i eliminar. Herència, canvi local, persistència en confirmar i informe QWeb s'han validat funcionalment i al navegador. |
| T020 | Pendent confirmat | Les plantilles de pressupost no contenen dades bancàries condicionals. |
| T021 | Pendent confirmat | Hi ha textos d'acceptació i un camp dedicat, però les QWeb no acrediten un bloc de signatura complet i sempre visible. |
| T022 | Parcial | La plantilla D conté Induspanel; A–C no. El valor `www.induspanel.es` no queda acreditat a les QWeb actuals. |
| T023 | Confirmat com a abast | No hi ha annexos tècnics automàtics. La inicialització elimina `quotation_document_ids`, cosa coherent amb no adjuntar-los en fase 1. |
| T024 | Pendent confirmat | No existeix un joc de proves PDF complet per m², ML, UDS i variants de client. |
| T025 | Resolt i implementat a proves | `Portes` és condicional: checkbox sota les línies i menú visible només quan s'activa. |
| T026 | Resolt i implementat a proves | La línia no és només informativa: es diu `Portes` i incorpora preu, impost, cost intern i marge específic. |
| T027 | Bloqueig funcional; implementació provisional | Existeixen camps i automatitzacions de base/IVA/total, però el resum final no està aprovat funcionalment. |
| T028 | Resolt i implementat a proves | `Portes` selecciona impostos de la llista nativa d'Odoo; el producte proposa `21% S`, però és editable segons fiscalitat. |
| T029 | Bloqueig funcional; implementació provisional | Existeixen `x_studio_descompte_global`, controls d'aplicació i automatitzacions, però la representació PDF no està aprovada. |
| T030 | Parcial implementat a proves | El wizard natiu permet seleccionar línies concretes i aplicar-hi un percentatge. La política de visibilitat al PDF continua pendent. |
| T031 | Bloqueig confirmat; implementació provisional | Existeix `x_studio_familia` i la lògica actual deriva família des de categoria/secció. Encara no hi ha decisió formal d'unificar-les. |
| T032 | Bloqueig confirmat | Algunes plantilles usen `doc.user_id`; no hi ha decisió formal entre aquest camp i un camp Studio. |
| T033 | Parcial, decisió encara oberta | Existeix herència de `partner.lang` cap a `x_studio_idioma_document`, però no s'ha validat el flux complet i només català/castellà estan actius com a idioma de contacte. |
| T034 | Parcial | Les QWeb contenen diccionaris CA/ES/EN, però els textos comercials no consten revisats/aprovats. |
| T035 | Bloqueig confirmat; dades divergents | `provesmnl112` usa `MNL-26·NNNN-A`; la principal conserva majoritàriament `S000NN` i exemples A/B. Cal tancar format i migració. |
| T036 | Confirmat | `data/catalog.json` estructura productes, nuclis, gruixos, chapes, recobriments i extres. |
| T037 | Confirmat | El motor genera SKU únic i 5.220 combinacions a partir de 87 bases × 5 chapes × 12 recobriments. |
| T038 | Confirmat com a codi | `src/odooSync.js` implementa preview, dry-run, sync i rollback per arxivament. No s'ha executat cap escriptura durant aquesta auditoria. |
| T039 | Confirmat a Odoo | Les plantilles MNL estan a `Panells / Coberta` i `Panells / Facana` a les dues bases. |
| T040 | Confirmat a Odoo | `Gruix`, `Chapa` i `Recobriment` existeixen i generen variants sempre. |
| T041 | Confirmat | Hi ha auditoria històrica i preview actual; no s'ha modificat pricing durant aquesta auditoria. |
| T042 | Confirmat avui | Les dues bases donen 5.220 `unchanged`, 0 `create`, 0 `update` i 0 `odoo-only`. |
| T043 | Confirmat avui | `scripts/audit_catalog_tariff.js` valida sense diferències 39 bases, 5 chapes, 3 extres i 11 recobriments. |
| T044 | Parcial | Les 5.220 variants tenen `description_sale` i `x_studio_descripcio_comercial`; cap de les línies llegibles tenia copiada la descripció comercial i el PDF no la referencia directament. |
| T045 | Pendent confirmat | El catàleg local continua centrat en panells; no hi ha cobertura completa de remats, cargoleria o canalons. |
| T046 | Parcial | Odoo té UOM `m²`, `ml`, `m` i `Units`; els panells usen `m²`. Falta una prova funcional completa de ML i UDS al pressupost/PDF. |
| T047 | Pendent confirmat | La UI local permet preparar elements, però no s'ha demostrat el flux complet de producte especial creat des del pressupost i disponible a Odoo. |
| T048 | Confirmat i ampliat | Els sis camps auditats existeixen a les dues bases, juntament amb camps addicionals de família, tipus de càlcul, descripció, cost i marge. |
| T049 | Parcial | La fórmula m² existeix i hi ha dues línies m² coherents a proves. A la principal hi ha línies històriques incoherents; no es pot considerar regressió superada. |
| T050 | Parcial | La còpia inicial existeix i està activa, però hi ha línies UDS històriques amb `x_studio_uds = 0` i quantitat Odoo diferent. |
| T051 | Parcial | Les automatitzacions de classificador/ordre estan actives. A proves 4/4 línies tenen classificador; a principal 21/31. |
| T052 | Parcial confirmat | El codi actual implementa m², ML i UDS. No hi ha cap línia ML de mostra i algunes UDS històriques fallen la comparació. |
| T053 | Pendent confirmat | L'auditoria ha estat de lectura; no s'ha executat una regressió que creï/modifiqui línies. |
| T054 | Resolt | `x_studio_uds` és l'entrada d'unitats; `product_uom_qty` és la quantitat calculada que Odoo factura/pressuposta. |
| T055 | Confirmat | L'extractor Python suporta pressupostos i factures. |
| T056 | Confirmat | `tmp-invoice-contacts.json`: 711 fitxers, 345 contactes, 0 errors. |
| T057 | Confirmat com a UI; dades no disponibles per defecte | Existeixen cerca, filtres i exportació. L'app arrenca, però `/api/contacts` torna 0 perquè `Z:\Adri\Dades MNLSolutions` no està disponible en aquesta sessió. |
| T058 | Confirmat i provat en lectura | El preview funciona: 342 existents/3 per crear a proves i 0 existents/345 per crear a principal. La sincronització d'escriptura existeix al codi, però no s'ha executat ara. |
| T059 | Parcial verificat | 342 dels 345 contactes ja existeixen a `provesmnl112`; no existeixen a principal. No hi ha prova que hagin estat revisats individualment abans de la càrrega. |
| T060 | Pendent confirmat amb risc concret | Els tres no importats són una adreça, un codi intern i una etiqueta de material. Només 24/345 tenen email i 5/345 telèfon. |
| T061 | Parcial | El camp i les tres opcions existeixen, però 357/358 contactes de proves i 10/11 de principal el tenen buit. |
| T062 | Parcial | El camp i quatre estats existeixen, però només un contacte de cada base té estat informat. |
| T063 | Parcial | L'automatització de bloqueig existeix, està activa i el codi comprova `bloquejat`; no s'ha fet una prova transaccional per confirmar els matisos d'editar/esborrany/enviar. |
| T064 | Parcial | Odoo suporta contactes fills; hi ha 7 a cada base. Existeixen contacte principal, contacte de pressupost i herència automàtica, però l'ús és encara molt limitat. |
| T065 | Confirmat | El camp `vat` no és obligatori a `res.partner`; els camps MNL tampoc. Hi ha contactes sense NIF. |
| T066 | Confirmat com a fora d'abast | L'obligació abans de facturar no forma part de la fase inicial. |
| T067 | Resolt el 29/07/2026 | El servidor local carrega el catàleg i els 345 contactes quan `MNL_SENSITIVE_DATA_DIR` apunta al directori privat local. |
| T068 | Confirmat | Els 12 fitxers JavaScript principals passen `node --check`; els nous scripts d'auditoria també es validen abans del lliurament. |
| T069 | Pendent confirmat | No hi ha suite de tests ni script `test` al `package.json`; els scripts `test_*` d'Odoo són proves manuals/integració, no una suite repetible completa. |
| T070 | Pendent confirmat | Les fonts estan majoritàriament en UTF-8, però les dades extretes encara contenen casos com `1Âª`. Cal normalitzar dades, no només fitxers font. |
| T071 | Resolt el 29/07/2026 | Restaurats l'historial Git de tres commits i el remot original a partir de la còpia de referència, sense sobreescriure els fitxers de treball. |
| T072 | Resolt el 29/07/2026 | El mestre és ara `docs/01_Estructura_Base_Odoo_MNL.md` i el TODO referencia la ruta canònica. |
| T073 | Resolt el 29/07/2026 | Les dades personals s'han mogut a `C:\Users\34605\Documents\MNLSolutions-private-data\contacts.json`; el fitxer temporal ja no és al repositori i les rutes sensibles estan ignorades. |
| T074 | Resolt el 29/07/2026 | El README reflecteix 5.220 variants, els dos entorns, el flux explícit de proves i la política de dades sensibles. |
| T075 | Parcial confirmat | `kawabunga` existeix com a QWeb i informe; el log de 22/07 registra acció correcta però render amb `Access Denied`. No s'ha fet revisió visual actual. |
| T076 | Confirmat com a recomanació d'abast | Continuar la factura ara desviaria la prioritat del PDF de pressupost fase 1. |
| T077 | Confirmat com a fora d'abast | Compres/RFQ/inventari/entregues/facturació real continuen fora de fase, encara que alguns mòduls estiguin instal·lats. |
| T078 | Decisió confirmada amb excepció | Cost/marge/proveïdor genèrics continuen ajornats i l'acció manual anterior encara és un risc. La lògica dedicada de `Portes` és una excepció aprovada, aïllada i validada només a proves. |
| T079 | Decisió confirmada; implementació contradictòria | Hi ha revisió B i automatitzacions A/B/C potencials. Línies opcionals i annexos automàtics no s'han trobat implementats. |

## Evidències reproduïbles afegides

- `scripts/audit_todo_odoo_readonly.js`: camps, mòduls, catàleg, QWeb i automatitzacions.
- `scripts/audit_todo_records_readonly.js`: valors reals de clients, pressupostos, línies i productes.
- `scripts/audit_contacts_preview_readonly.js`: comparació dels contactes extrets amb Odoo.
- `scripts/audit_catalog_preview_readonly.js`: comparació de les 5.220 variants locals amb Odoo.
- `scripts/audit_catalog_tariff.js`: contrast automàtic entre tarifa Markdown i catàleg JSON.
- `scripts/inspect_odoo_qweb_readonly.js`: inspecció estructural de plantilles QWeb.

Tots els scripts anteriors fan només consultes a Odoo. L'única escriptura que poden fer és sortida estàndard local.
