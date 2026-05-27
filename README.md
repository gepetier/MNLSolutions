# MNL Odoo Sync

Aplicacio interna per sincronitzar el cataleg de panells amb Odoo i crear pressupostos de prova amb calcul:

```text
amplada x llargada = m2 x quantitat = preu
```

## Objectius actuals

1. Pujar a Odoo el cataleg aprofitant categories, plantilles i variants natives.
2. Treballar els pressupostos amb quantitat en m2 calculada des d'amplada, llargada i unitats.
3. Crear un pressupost de prova a Odoo.
4. Mes endavant: afegir fitxes tecniques de producte als pressupostos.

## Configuracio

1. Crea una API key a Odoo per l'usuari que fara la sincronitzacio.
2. Copia `.env.example` a `.env`.
3. Omple:

```env
ODOO_URL=https://la-teva-empresa.odoo.com
ODOO_DB=nom_base_de_dades
ODOO_USERNAME=usuari@empresa.com
ODOO_API_KEY=...
```

L'usuari necessita permisos sobre `Productes`, `Contactes`, `Vendes`, categories de producte, atributs i variants.

## Comandes principals

```bash
npm run odoo:ping
npm run catalog:combinations
npm run odoo:preview
npm run odoo:dry-run
npm run odoo:sync
npm run odoo:quote
```

`odoo:preview` compara el cataleg local amb variants `product.product` d'Odoo per SKU (`default_code`).

`odoo:dry-run` mostra el pla optimitzat sense escriure canvis.

`odoo:sync` crea o actualitza Odoo amb aquesta estructura:

- categories: `Panells / Coberta` i `Panells / Facana`
- plantilles: una per cada combinacio `panell + nucli`, per exemple `HI-ST-PIR`
- atributs: `Gruix`, `Chapa` i `Recobriment`
- variants: una per cada combinacio final, amb SKU propi, per exemple `HI-ST-035-PIR-55-NONE`
- preu: Odoo el calcula amb extres d'atribut (`price_extra`): gruix = preu base, chapa = ajust, recobriment = ajust
- unitat m2 si Odoo la troba com `m2`, `m²` o `m2`

Aixo redueix les plantilles a Odoo i deixa les 3.780 combinacions com variants natives, no com 3.780 productes independents.

Si un SKU ja existeix en un producte antic d'Odoo, la sincronitzacio s'atura per evitar duplicats. Cal arxivar o revisar aquell producte abans de migrar-lo a variant.

Cada `odoo:sync` guarda un fitxer de rollback a `logs/odoo-sync-....json`. Per revisar que arxivaria:

```bash
node src/cli.js products:rollback:dry-run logs/odoo-sync-....json
```

Per fer rollback real:

```bash
node src/cli.js products:rollback logs/odoo-sync-....json
```

El rollback arxiva les plantilles creades per aquella sync (`active=false`). No elimina atributs compartits ni categories, per evitar esborrar configuracio reutilitzable d'Odoo.

## Pressupost de prova

Edita `examples/odoo-quote.sample.json` i executa:

```bash
npm run odoo:quote
```

La linia busca la variant a Odoo pel SKU de la combinacio. Per tant, primer cal haver executat `npm run odoo:sync`.

## App local

```bash
npm run dev
```

URL:

```text
http://localhost:4173
```

La pantalla conserva el cataleg editable, la generacio de variants i el preview de sincronitzacio amb Odoo.
