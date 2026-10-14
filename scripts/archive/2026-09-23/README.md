# Eines històriques de setembre

Recuperades de `tmp/` el 14/10/2026 perquè el clone conservi també el codi utilitzat en l'anàlisi de factures, contactes i categories. Les rutes específiques d'aquest PC s'han substituït per variables d'entorn; els imports apunten al codi versionat. No s'han executat contra Odoo durant aquesta recuperació.

Executa des de l'arrel del repositori. Configura `ODOO_ENV_FILE` i `MNL_SENSITIVE_DATA_DIR` per a JavaScript. Per a Python, exporta també `MNL_INVOICE_SOURCE_DIR` amb la carpeta de factures Excel; les eines Python no llegeixen `.env`.

| Eina | Ús i dependències privades |
| --- | --- |
| `extract_invoice_concepts.py` | Llegeix `MNL_INVOICE_SOURCE_DIR`; desa `invoice_concepts.json` a `MNL_SENSITIVE_DATA_DIR`. |
| `audit_invoice_concepts.py` | Llegeix el JSON privat de conceptes; mostra dades extretes. |
| `inspect_invoice_layout.py`, `inspect_invoice_exceptions.py` | Inspecció de les mostres de l'extracció original; els índexs depenen de l'ordre del lot històric. |
| `audit_contact_batch.js`, `check_contacts_odoo_readonly.js` | Auditoria de `contacts.json`; la primera pot mostrar dades personals a la consola. |
| `upload_contacts_reviewed.js` | Importador del lot històric 345 → 342, amb base esperada i `--apply`. Requereix `contacts.json` i `contact-exclusions.json` privat (array dels tres noms exclosos revisats). |
| `create_odoo_invoice_families.js` | Pla de les 13 famílies, a partir del JSON privat; base esperada i `--preview`/`--apply`. |
| `create_odoo_invoice_subfamilies.js` | Pla HISTÒRIC de 45 subfamílies, anterior a la revisió final de 31. No tornar a aplicar aquest pla. |
| `check_odoo_categories_readonly.js` | Snapshot de categories de la base seleccionada; desa el JSON a la carpeta privada. |
| `align_odoo_categories_to_test.js` | Comparació amb `category-tree-provesmnl202609.json` privat; `--apply` elimina categories sobrants buides. És una eina històrica lligada a aquella base. |

La jerarquia final vigent és la documentada a `docs/PRODUCT_SUBFAMILIES_2026-09-23.md`: 31 subfamílies i 48 categories totals. Els scripts antics conserven passos intermedis; no són un procediment automàtic per reconstruir l'estat final. Audita i prepara un pla nou abans d'aplicar-los. Les autoritzacions de setembre no autoritzen una nova escriptura a principal.

Els fitxers d'entrada i els logs detallats romanen privats. La documentació de `docs/` conserva els resultats i les decisions sense requerir accés als logs per entendre el punt de represa.
