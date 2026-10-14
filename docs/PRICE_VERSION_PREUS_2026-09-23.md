# Versió de preus PREUS 23/09/2026

## Estat

- Entorn: Odoo de proves `provesmnl202609` (Odoo Online saas~19.3).
- Llista de preus: `PREUS 23/09/2026`.
- Empresa: MNL Technical Consultant.
- Moneda: EUR.
- Estat: activa a proves; no creada a Principal.
- Data de captura: 23/09/2026.

## Contingut

La llista conté una regla de preu fix per cadascuna de les 5.220 variants Huurre. Els preus es van llegir de `product.product.lst_price` a Odoo i es van contrastar amb el catàleg local abans de carregar-los: 5.220 SKU presents i zero diferències.

La regla global de la llista usa el preu de venda del producte sense descompte. Això manté el comportament dels productes fora de la tarifa Huurre quan s'escull aquesta llista.

No s'hi inclouen `MNL-PORTES` (preu calculat pel seu flux específic), `Booking Fees`, `Manoleria` ni `Descuento`.

## Ús als pressupostos

La llista no s'ha assignat com a predeterminada als clients. En crear un pressupost a Proves, cal seleccionar `PREUS 23/09/2026` al camp **Versió de preus**, dins la pestanya **Preus**. Una vista d'extensió mostra aquest camp perquè la personalització anterior l'amagava (`scripts/install_odoo_quote_price_version_field.js`). Odoo guarda la selecció a la comanda i les seves línies conserven els imports. Els pressupostos existents no s'han modificat.

## Pas següent

Crear i validar aquesta mateixa versió a Principal només després d'aprovar el comportament a Proves, amb preview, evidència i pla de rollback, segons `docs/ENVIRONMENTS.md`.
