# Promoció de `provesmnl202609` a principal — 23/09/2026

Destinació: `mnl-technical-consultant`. Operació autoritzada expressament per l'usuari el 23/09/2026. S'han aplicat les personalitzacions de proves a principal amb còpia prèvia i comprovació posterior de l'estat.

## Canvis aplicats

- Terminis de pagament natius: `Transferència Bancaria` (0 dies), `Confirming 60 dies` i `Rebut bancari 30 dies`; traduccions alineades a `en_US`, `es_ES` i `ca_ES`; vistes de client i pressupost connectades als camps natius.
- Migrades a `Rebut bancari 30 dies` les referències que feien servir `30 Days`: 1 client i 8 pressupostos. Els terminis genèrics sobrants (IDs 4–10) han quedat inactius. El backup conserva les referències originals per poder revertir-les.
- Configuració de `Portes`: model/camps del proveïdor, camps de pressupost i línia, accions, vistes, menú i producte `MNL-PORTES`. S'han omès els proveïdors d'exemple; cal crear els proveïdors reals abans d'utilitzar el càlcul de transport.
- Consolidat el pipeline de quantitats i desactivades les automatitzacions duplicades `TEST` i `TEST2`.
- Vinculats els quatre informes MNL a `sale.order` com a informes PDF.
- Afegit el camp de selecció `Nivell de risc MNL` a la fitxa de client.
- Corregida l'acció de classificador/família perquè normalitzi prefixos numèrics repetits. Alineades les traduccions dels terminis. No s'ha modificat el pressupost de regressió de proves.
- Desactivades les dues automatitzacions que recalculaven la validesa; principal usa la validesa nativa d'Odoo.

Les 48 categories i subcategories i els 342 contactes vàlids ja constaven copiats i verificats a principal el mateix dia; no s'han tornat a importar.

## Evidència i còpies prèvies

- Pagaments: `logs/odoo-native-payment-terms-backup-mnl-technical-consultant-2026-09-23T17-58-57-103Z.json` i `logs/odoo-native-payment-terms-install-mnl-technical-consultant-2026-09-23T17-59-03-603Z.json`.
- Transport: còpia inicial `logs/odoo-transport-backup-mnl-technical-consultant-2026-09-23T17-59-13-745Z.json`; instal·lació final `logs/odoo-transport-install-mnl-technical-consultant-2026-09-23T18-03-59-601Z.json`.
- Quantitats: `logs/odoo-quantity-pipeline-backup-mnl-technical-consultant-2026-09-23T18-00-42-620Z.json` i `logs/odoo-quantity-pipeline-install-mnl-technical-consultant-2026-09-23T18-00-44-432Z.json`.
- Informes: `logs/odoo-quote-report-bindings-backup-mnl-technical-consultant-2026-09-23T18-00-53-396Z.json` i `logs/odoo-quote-report-bindings-install-mnl-technical-consultant-2026-09-23T18-00-55-569Z.json`.
- Nivell de risc: `logs/odoo-customer-risk-backup-mnl-technical-consultant-2026-09-23T18-01-22-423Z.json` i `logs/odoo-customer-risk-install-mnl-technical-consultant-2026-09-23T18-01-24-061Z.json`.
- Classificador/traduccions: `logs/odoo-restart-regressions-backup-mnl-technical-consultant-2026-09-23T18-01-40-804Z.json`.

La lectura posterior confirma els tres terminis i les seves traduccions, les 4 vinculacions d'informe, el camp de risc a la vista, l'acció de classificador actualitzada, les automatitzacions duplicades desactivades, i que no s'han creat pressupostos de prova ni proveïdors d'exemple a principal. No s'ha executat una regressió funcional des de la interfície després del desplegament.

## Diferències restants a l'auditoria entre bases

- La llista de preus `PREUS 23/09/2026` (5.220 regles de producte i una regla global) i la vista que exposa `Versió de preus` només existeixen a proves. La càrrega a principal continua pendent de l'aprovació prevista a [PRICE_VERSION_PREUS_2026-09-23.md](PRICE_VERSION_PREUS_2026-09-23.md).
- El producte de proves `Manoleria` no existeix a principal. És actiu, sense SKU, preu de venda 1 €, sense descripcions i sense línies de venda, compra o factura associades.
- Els dos proveïdors de transport d'exemple de proves s'han omès d'acord amb la instrucció de l'usuari. Principal no té encara proveïdors reals de transport.
- El pressupost `REGRESSIO-WEB-20260923-A` i altres dades de prova romanen només a proves.

La comparació de lectura confirma igualtat en els 78 camps personalitzats, 48 categories, 22 automatitzacions MNL comparades, els tres terminis actius i els quatre informes vinculats. El recompte de productes és 5.227 a proves i 5.226 a principal; la diferència és `Manoleria`.
