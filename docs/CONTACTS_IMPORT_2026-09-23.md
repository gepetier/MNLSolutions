# Importació de contactes de factures — 23/09/2026

## Abast

- Font privada: `contacts.json`, extret de 711 factures Excel.
- Registres extrets: 345.
- Contactes importats: 342.
- Registres exclosos: 3 errors d'extracció (una adreça, un codi intern i una etiqueta de material).

## Revisió prèvia

Es va confirmar que els tres registres exclosos no eren noms de clients. En el lot importat no es van trobar NIF duplicats ni noms duplicats després de normalitzar-los. El preview de lectura va identificar 0 coincidències dels 342 contactes a cadascuna de les dues bases abans de la càrrega.

## Execució i verificació

| Base Odoo | Creats | Coincidències després | Pendents del lot vàlid |
| --- | ---: | ---: | ---: |
| `provesmnl202609` | 342 | 342 | 0 |
| `mnl-technical-consultant` | 342 | 342 | 0 |

La comparació final del lot original de 345 registres va donar 342 coincidències i 3 registres exclosos a cadascuna de les bases. La comprovació fa servir NIF, correu, telèfon o nom, en aquest ordre. No es van carregar els camins locals dels fitxers font als comentaris dels contactes d'Odoo.

Els registres detallats de l'operació, amb identificadors d'Odoo i sense dades personals, són a `tmp/contact-upload-*.jsonl` i estan exclosos de Git. Queda pendent revisar de manera gradual els camps incomplets i les possibles equivalències de noms que no es poden resoldre automàticament.
