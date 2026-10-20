# Coherència del pressupost — 20/10/2026

Aplicat i contrastat exclusivament a `provesmnl1410`. Principal sense canvis. Aquest registre resol els punts 1–4 del banc anterior; el registre del banc conserva les observacions històriques.

## Comportament acordat

- Canviar empresa i seleccionar un contacte abans del mateix desament conserva la selecció manual. La persistència respecta els camps explícits del `write`, inclosos els que mantenen el valor anterior; no torna a buidar el contacte. Es rebutja un contacte d’un altre client fiscal.
- Formulari, portal i PDF comparteixen ordre, quantitats i imports. El portal i les rutes natives d’informe de pressupost criden el mateix document QWeb. Dotze columnes externes; marges només al formulari intern, sense descripcions de producte. A4 vertical. El portal permet desplaçament horitzontal per conservar la llegibilitat de les columnes.
- Editar la data de validesa actualitza la frase de les condicions. Editar la data o els dies de validesa dins la frase actualitza el camp. Es conserva el text manual restant. Formats admesos: DD/MM/AAAA, AAAA-MM-DD i dies enters amb expressions explícites de validesa en CA/ES/EN. Dates invàlides o diverses valideses incompatibles retornen un error. Esborrar la clàusula de validesa elimina la data; buidar la data elimina la clàusula.
- Es poden desar esborranys incomplets. Generar PDF exigeix llargada i amplada positives per m², i llargada positiva per ml. Els articles UDS no requereixen dimensions; els ml no requereixen amplada. El portal mostra el detall pendent en lloc del document incomplet.

## Evidència d’aquesta execució

| Prova | Resultat |
| --- | --- |
| Portal real i retorn al mode d’edició | Taula compartida; sense diàleg d’error després de corregir l’ID i les dades requerides pels widgets natius, també en el cas incomplet |
| Client contacte → empresa + contacte manual, mateix desament | Contacte conservat al formulari i a la lectura final de BD |
| Data 04/12 → text 10/12 i desament | Camp i condicions desats a 10/12 |
| Entrada de teclat al text amb 12/12 | Camp actualitzat a 12/12 abans de desar |
| Restauració del camp a 19/11 | Text actualitzat abans de desar; BD final coherent, 30 dies |
| Llargada m² zero per interfície | Esborrany desat, portal amb avís i PDF rebutjat amb UserError |
| Llargada ml zero i amplada m² zero per API | Validador rebutja els dos casos; restauració en finally |
| UDS sense dimensions i ml sense amplada | Document complet acceptat |
| Fotografia final de BD | 12 línies de producte, 0 errors i 0 avisos del comprovador |
| HTML final del PDF i taula real del portal | 12 columnes, ordre i valors coincidents amb BD; marges i descripcions absents |
| PDF final | Una pàgina A4 vertical; revisió visual sense retalls ni solapaments |
| Proves locals | 8 proves de validesa; `npm run check` correcte |

Estat final: pressupost únic en esborrany restaurat, empresa i contacte ficticis, català, transferència, validesa 19/11/2026. Base 5.161,02 €, IVA 1.083,81 €, total 6.244,83 €. La diferència de 0,02 € entre suma amb IVA de files i total fiscal global continua documentada; no s’ha alterat el càlcul fiscal.

La prova d’edició usa entrada de teclat i sortida del camp: un `fill()` automatitzat sense esdeveniments de teclat no va refrescar la data abans de desar, tot i persistir correctament. No comptar aquest primer intent com una sincronització visible verificada.

## Fitxers i reversió

- `scripts/fix_odoo_customer_onchange.js`: herència de client i preservació d’eleccions manuals.
- `scripts/install_odoo_quotation_validity.js` i `scripts/assets/quotation_validity.py`: regles de data/text i persistència; substitueixen la funció antiga que regenerava condicions manuals.
- `scripts/install_odoo_standard_quotation.js`, `templates/quotation_standard.xml`, `templates/quotation_portal_standard.xml` i `scripts/assets/quotation_dimensions_validation.py`: document compartit i validació.
- `python scripts/test_quotation_validity.py`: regressió pura, sense xarxa ni credencials.

Instal·ladors amb preview per defecte; `--apply` escriu només en una base de proves seleccionada explícitament. Els backups privats de `logs/` permeten `--rollback RUTA_BACKUP`. Per desfer tot el desplegament de validesa cal usar la còpia inicial, anterior a la neutralització de les funcions antigues, i la primera instal·lació que registra les automatitzacions creades. Els backups posteriors només reverteixen la seva reaplicació. No versionar aquests backups.

## Límits que continuen pendents

No s’ha provat enviament, acceptació/signatura, confirmació, multipàgina ni concurrència. El bloqueig verificat cobreix generació de PDF i contingut del portal, no el flux d’acceptació natiu. La descàrrega directa del botó Imprimir continua sense bytes accessibles per comparar; els PDF renderitzats al servidor sí s’han contrastat. No s’ha desplegat a principal.
