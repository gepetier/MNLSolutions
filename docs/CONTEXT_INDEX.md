# Índex de context compartit — 14/10/2026

El context necessari per reprendre el desenvolupament és versionat. No cal recuperar aquest xat per entendre les decisions. Els documents següents tenen funcions diferents; una auditoria antiga no substitueix un estat actualitzat.

| Document | Funció i vigència |
| --- | --- |
| `../AGENTS.md` | Instruccions de projecte que Codex llegeix al nou clone. |
| `../README.md` | Visió general, funcionalitats i ordres. |
| `DEVELOPMENT_SETUP.md` | Instal·lació, arrencada i accés a recursos privats. |
| `DEVELOPMENT_HANDOFF_2026-10-14.md` | Punt de represa, prioritats i limitacions de verificació. |
| `../TODO.md` | Estat de tasques actualitzat amb les evidències de setembre. |
| `01_Estructura_Base_Odoo_MNL.md` | Mestre funcional original. |
| `02_Handoff_Codex_Odoo_MNL_Fase1.md` | Decisions posteriors; preval sobre 01 quan el corregeix. |
| `ENVIRONMENTS.md` | Política d'entorns, proves i desplegament. |
| `PRODUCTION_PROMOTION_2026-09-23.md` | Estat desplegat a principal i diferències restants a aquella data. |
| `CONTACTS_IMPORT_2026-09-23.md` | Resultat verificat de la importació 345 → 342. |
| `PRODUCT_FAMILIES_2026-09-23.md` | 13 famílies classificades. |
| `PRODUCT_SUBFAMILIES_2026-09-23.md` | Jerarquia final revisada: 31 subfamílies; supera el pla intermedi de 45. |
| `PRICE_VERSION_PREUS_2026-09-23.md` | Preus congelats només a proves; promoció a principal pendent. |
| `RESTART_AUDIT_2026-09-16.md` | Diagnòstic històric, recuperació i regressió web del 23/09. |
| `TODO_AUDIT_2026-07-29.md` | Auditoria històrica T001–T079; les evidències posteriors actualitzen el TODO. |
| `tarifa-huurre-master.md` | Font del pricing local; no canvia l'abast funcional dels mestres. |
| `quote-template-styles.html`, `quote-template-previews/` | Propostes visuals A–D; no demostren validació d'un PDF real. |
| `../data/README.md` | Política de dades locals. |
| `../scripts/archive/2026-09-23/README.md` | Eines històriques recuperades de tmp, dependències i passos superats. |

## Estat consolidat

La promoció del 23/09 supera les afirmacions antigues que deien que principal no tenia pagaments/Portes o que els informes estaven sense vincular. Els quatre informes estan vinculats segons aquell registre, però encara falta escollir i revisar visualment la plantilla definitiva.

Les famílies/subfamílies existeixen segons els registres de setembre; això no prova que s'hagin creat tots els productes i tarifes de cada família. El motor local continua centrat en les 5.220 variants de panells.

La regressió de proves del 23/09 valida panell m², transport, pagaments i persistència, amb el problema pendent dels camps dimensionals a la fitxa estreta. ML comercial, PDF definitiu i revisió funcional després del desplegament a principal continuen pendents.

## Recursos que no arriben amb Git

| Recurs | Recuperació al nou equip |
| --- | --- |
| `112.env`, `BDprincipal.env` i qualsevol clau Odoo | Copiar-los per un canal privat o generar claus noves; revisar URL/base vigent abans d'utilitzar-los. |
| `contacts.json`, `quote-products.json`, `invoice_concepts.json` | Copiar a la carpeta externa indicada per `MNL_SENSITIVE_DATA_DIR`. |
| Excel/PDF font | Recuperar la carpeta privada original; per les eines històriques, configurar `MNL_INVOICE_SOURCE_DIR`. |
| Backups i evidències de `logs/`, `outputs/` i `tmp/` | Transferir privadament si es necessita l'evidència detallada o un rollback històric. Els resultats funcionals són resumits als documents versionats. |
| Catàleg modificat per l'aplicació Electron | Comprovar si hi ha `catalog.json` al directori de dades d'usuari d'Electron, que pot prevaldre sobre el catàleg del repo. |
| Estat Odoo/Studio | Viu a Odoo, no al clone. Cal accés a la mateixa base i auditoria abans d'escriure. |
| Dependències i configuració personal de Codex | Instal·lar dependències amb npm/pip; sessions, plugins, permisos i historial de xats no formen part del repositori. `AGENTS.md` i els documents preserven el context del projecte. |

Un clone proporciona codi i context de desenvolupament. Per reproduir també la sessió amb Odoo, dades locals i backups cal aquesta configuració privada; no afirmar que només Git transfereix aquests recursos.
