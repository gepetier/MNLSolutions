# Famílies de conceptes a Odoo — 23/09/2026

Les 13 famílies classificades de l'inventari de factures són categories de producte (`product.category`) a `provesmnl202609` i `mnl-technical-consultant`. Les dues categories de panells existents s'han reutilitzat; es van crear 11 categories noves a cada base. Després de la revisió de l'usuari, queden 31 subfamílies classificades sota aquestes categories. La categoria «Per revisar» no s'ha creat, perquè agrupa conceptes pendents de classificar.

| Família de l'inventari | Categoria d'Odoo | Acció |
| --- | --- | --- |
| Panells de coberta | Panells / Coberta | Reutilitzada |
| Panells de façana | Panells / Facana | Reutilitzada |
| Altres panells | Panells / Altres | Creada |
| Remats i xapes | Remats i xapes | Creada |
| Transport i ports | Transport i ports | Creada |
| Perfils i subestructures | Perfils i subestructures | Creada |
| Enginyeria i serveis | Enginyeria i serveis | Creada |
| Ajustos i bestretes | Ajustos i bestretes | Creada |
| Juntes i segellat | Juntes i segellat | Creada |
| Llucernaris | Llucernaris | Creada |
| Cargoleria i accessoris | Cargoleria i accessoris | Creada |
| Canalons i drenatge | Canalons i drenatge | Creada |
| Acabats i colors | Acabats i colors | Creada |

Les subfamílies revisades estan detallades a [PRODUCT_SUBFAMILIES_2026-09-23.md](PRODUCT_SUBFAMILIES_2026-09-23.md).

El 23/09/2026 es va copiar l'arbre revisat de proves a principal. Les 14 subcategories sobrants de principal eren buides i sense filles; es van eliminar. La comprovació final troba 48 categories a cada base i cap diferència en noms ni jerarquia. No s'han creat productes ni canviat categories de productes existents. Els registres d'execució amb identificadors d'Odoo són a `tmp/families-upload-*.jsonl`, `tmp/subfamilies-upload-*.jsonl` i `tmp/category-align-*.jsonl`, exclosos de Git.

Continua pendent la decisió funcional de si la categoria de producte i la família comercial dels pressupostos han de ser el mateix camp.
