# Plantilla predeterminada de pressupost — 19/10/2026

## Decisió vigent

L'usuari demana una plantilla predeterminada amb les mateixes files i columnes de la finestra de pressupostatge, sense camps relatius als marges ni descripcions dels productes. Aquesta decisió preval sobre les propostes anteriors d'agrupar diverses mides en sublínies d'un únic producte al PDF.

La nova plantilla conserva les files desades, ordenades per `sequence,id`. La mateixa variant amb dues mides segueix sent dues files. El total de variant es mostra a les mateixes files que a la finestra, sense reagrupacions noves.

## Columnes

| Columna | Font Odoo |
| --- | --- |
| Class. | `x_studio_classificador` |
| Article | `product_id.display_name`, sense SKU; inclou la variant |
| Unitats | `x_studio_uds` |
| Longitud | `x_studio_long`, 3 decimals com al formulari |
| Amplada | `x_studio_ancho_1`, 3 decimals com al formulari |
| Quantitat | `x_studio_cantidad` |
| Total quantitat | `x_studio_total` |
| Ud. | `x_studio_tipus_calcul` |
| Unitat | `product_uom_id.name` |
| Preu unitari final | `price_unit` |
| Import sense IVA | `x_studio_importe_mnl` |
| Import amb IVA | `price_total` |

Es conserven les dues columnes d'unitat presents a la finestra: tipus de càlcul i unitat nativa d'Odoo. No es mostren cost, preu base intern, marge nominal/percentual, marges antics ni descomptes. El nom i els atributs de la variant permeten identificar l'article; la fila de producte no consulta `line.name`, `description_sale` ni la descripció comercial. Les seccions i notes explícites conserven el seu text.

## Presentació

A4 horitzontal per mantenir llegibles les dotze columnes. Capçalera MNL a l'esquerra i client fiscal a la dreta, sense bloc d'entrega/obra. Etiquetes del client sempre presents. Inclou pagament, validesa, base imposable, IVA, total i acceptació/signatura. Dades bancàries només per transferència segons la configuració actual. Textos CA/ES/EN, des del camp d'idioma del document. Subtotals de secció en la mateixa fila de capítol. La taula repeteix la capçalera en salts de pàgina.

## Instal·lació i predeterminada

- Font versionada: `templates/quotation_standard.xml`.
- Instal·lador: `scripts/install_odoo_standard_quotation.js`.
- Informe `Pressupost MNL`, ID 842; paper A4 horitzontal ID 12, a `provesmnl1410`.
- L'informe és l'única proposta de pressupost vinculada al menú Imprimir. Les quatre proves A-D es conserven, però sense vinculació al menú.
- Una vista QWeb heretada redirigeix el document natiu de pressupostos en estat esborrany/enviat a la mateixa plantilla. Això cobreix també les rutes natives de generació sense canviar l'ID de l'informe canònic.
- Les comandes confirmades i les proformes conserven el contingut natiu. Els dos informes canònics comparteixen ara el format de paper horitzontal.
- No s'ha desplegat a principal.

```bash
# Definir ODOO_ENV_FILE amb credencials privades de proves.
node scripts/install_odoo_standard_quotation.js
node scripts/install_odoo_standard_quotation.js --apply
node scripts/install_odoo_standard_quotation.js --apply --activate
node scripts/render_odoo_quotation_preview.js ID_PRESSUPOST
node scripts/install_odoo_standard_quotation.js --rollback logs/odoo-standard-quotation-BASE-TIMESTAMP.json
```

Cada aplicació crea un backup privat de vistes i informes. Per desfer tota la instal·lació, revertir en ordre invers els backups d'activació i de primera instal·lació. La reversió conserva el paper creat sense eliminar-lo.

## Validació

Renderitzat PDF real a Odoo a través d'una acció temporal de servidor. L'acció i els adjunts temporals es retiren després de descarregar-ne els bytes. Les credencials i les evidències amb dades no es publiquen a Git.

Mostra de proves amb client fictici, dues mides de la mateixa variant i un article UDS. `scripts/check_quotation_preview.py` contrasta l'HTML amb una fotografia privada de línies: ordre/IDs, dotze cel·les per fila, unitats, quantitats, totals de variant, preus i imports. Verifica que un text marcador introduït a la descripció del producte no apareix i que no hi ha cap columna interna de marge.

PDF A4 horitzontal revisat visualment: capçalera, taula, imports, seccions, acceptació i peu llegibles i sense retalls. Exemple verificat d'una pàgina. La validació directa del botó d'impressió al navegador autenticat resta pendent; la ruta canònica s'ha comprovat mitjançant renderització del seu informe.

## Actualització 20/10/2026 — A4 vertical

Per petició de l’usuari, la plantilla predeterminada passa a A4 vertical (paper ID 13), marges laterals de 8 mm i les mateixes dotze columnes. S’ajusten proporcions, espaiat i capçalera perquè les dades siguin llegibles. Les referències anteriors a horitzontal descriuen la primera versió del 19/10. La font i l’instal·lador generen ara la versió vertical.

L’instal·lador conserva la clau de la vista QWeb heretada quan la reinstal·la, per respectar la validació de claus d’Odoo. Els fitxers de codi/documentació d’aquest lot es van publicar a GitHub el 20/10/2026 després de l’autorització explícita de l’usuari (PR #1).
