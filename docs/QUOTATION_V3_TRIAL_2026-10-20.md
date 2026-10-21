# Pressupost v3 de prova — 20/10/2026

Petició de l’usuari: versió PDF alternativa per valorar la presentació. La v2 continua sent la plantilla predeterminada de proves; no es modifica el formulari ni el portal en aquesta prova.

- Nou columnes: Class., Article, Unitats, Longitud (m), Amplada (m), Quantitat, Unitat, Preu unitari (€), Import s/IVA (€).
- Class. i Article només a la primera fila consecutiva de la mateixa variant exacta. Una secció, nota o altra variant reinicia el bloc; no es fusionen ni s’eliminen files de dimensions.
- Una sola columna Unitat amb m²/ml/uds; eliminats la columna amb IVA i els seus subtotals de secció. El resum fiscal final conserva base, IVA i total natius.
- Capçaleres en una línia, moneda en línia i sense salts forçats. Sense codis SKU ni descripcions addicionals.
- Padding de cel·les: taula de línies 7 px verticals / 6 px horitzontals, capçaleres 8/6; també espai interior en client/emissor, metadades i resum. Fons de productes #f5f8fa i vores laterals contínues.

Font: `templates/quotation_v3.xml`. Generació: `scripts/render_odoo_quotation_trial.js ID_PRESSUPOST`, amb ODOO_ENV_FILE explícit de proves i MNL_PREVIEW_OUTPUT privat. Crea QWeb/informe temporals sense binding, reutilitza el renderitzador existent i elimina els registres temporals en finally. No escriu cap pressupost ni substitueix informes existents.

Validació: 12 files de producte, 9 cel·les per fila, mateix ordre/IDs i quantitats/preus/imports contrastats amb la fotografia privada de BD. Class./Article buits només a les continuacions; comprovador `check_quotation_preview.py ... --v3`. PDF A4 vertical d’una pàgina revisat visualment. Total conservat de 6.244,83 €. La prova no valida multipàgina; un bloc partit entre pàgines podria necessitar repetir-ne la identificació.

IBAN i arrodoniment fiscal es mantenen fora d’aquesta passada per decisió de l’usuari. V3 pendent del seu vistiplau abans d’adoptar-la com a predeterminada.
