# Descomptes ajornats — 19/10/2026

Decisió de l'usuari: deixar els descomptes en standby i amagar-ne les referències del pressupostatge.

## Abast

Ocultació de la interfície de pressupostos a `provesmnl1410`:

- Descompte individual i efectiu de la taula i del detall de línia.
- Representació del descompte a les targetes de línia.
- Botons natius de descomptes, inclòs el botó deshabilitat.
- Aplicació de descompte al client, percentatge global i opció de mostrar-lo al PDF.
- Grup de descompte fix, import, criteri abans/després d'IVA i botons associats.
- Camps de descompte que apareixen a les subllistes incloses al formulari.

Es conserven els camps tècnics invisibles perquè les automatitzacions existents continuïn disposant de les dependències. No s'esborren dades, no es posen imports a zero i no s'alteren els informes ni línies de descompte històriques. La vista és reversible. No s'ha desplegat a principal.

## Implementació

`scripts/hide_odoo_quotation_discounts.js` obté el formulari combinat vigent, genera una vista heretada amb prioritat 1000 i oculta les instàncies de cada control, incloses columnes opcionals de llista. Conserva una còpia prèvia a `logs/` i permet desactivar/restaurar la vista. Si existissin accions contextuals de descomptes vinculades a `sale.order`, en retira la vinculació; en aquesta base no n'hi havia.

```bash
# Seleccionar abans ODOO_ENV_FILE amb un fitxer privat de proves.
node scripts/hide_odoo_quotation_discounts.js
node scripts/hide_odoo_quotation_discounts.js --apply
node scripts/hide_odoo_quotation_discounts.js --rollback logs/odoo-hide-discounts-BASE-TIMESTAMP.json
```

Verificació: la vista combinada posterior no ha de contenir cap control de descompte visible. Aquesta comprovació d'arquitectura no equival a una prova visual en un navegador autenticat. Cal recarregar el formulari per obtenir la vista nova.

Les definicions anteriors de descomptes es conserven com a referència històrica per a una futura represa. Aquesta decisió ajorna la seva implementació/validació i preval sobre la prioritat anterior.
