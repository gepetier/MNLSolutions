# 02_Handoff_Codex_Odoo_MNL_Fase1

**Projecte:** Odoo MNL
**Objectiu del document:** donar context funcional i tecnic a Codex per continuar la implementacio/analisi d'Odoo MNL sense perdre decisions ja preses.
**Origen:** 2026-07-08
**Actualització de context:** 2026-10-14; últim desplegament documentat 2026-09-23
**Base:** `01_Estructura_Base_Odoo_MNL.md` + decisions posteriors de la conversa.

---

## 0. Instruccions per a Codex

Aquest document es context de projecte. Abans de modificar res a Odoo, cal retornar un pla tecnic clar.

### Regles generals

- No entrar encara en compres, RFQ, inventari, recepcio, entregues o facturacio, excepte si es imprescindible per no prendre una mala decisio d'estructura.
- Prioritzar solucions viables a **Odoo Online / SaaS Enterprise + Studio**.
- Si alguna cosa requereix desenvolupament custom, modul propi, acces no disponible a Odoo Online o una personalitzacio fragil, marcar-ho explicitament com a risc.
- No assumir que `standard_price` es cost real fiable.
- No assumir que hi ha proveidors ni tarifes configurades si la base de dades no en te.
- No canviar el comportament de pricing de variants en fase inicial.
- No implementar logica nova de cost/marge si no es demana explicitament.
- Si cal fer canvis, proposar-los primer en format:

```text
1. Canvi proposat
2. Model afectat
3. Camp/vista/automatitzacio afectada
4. Risc Odoo Online/Studio
5. Com provar-ho
```

---

## 1. Abast immediat del projecte

La fase actual queda limitada a:

```text
1. Productes
2. Clients
3. Pressupostatge
```

Queden fora de fase inicial:

```text
- Compres / RFQ
- Inventari / stock
- Recepcions
- Entregues/logistica
- Facturacio real
- Comptabilitat avancada
```

---

## 2. Estat tecnic auditat de l'entorn Odoo

Auditoria feta sobre l'entorn `mnl-technical-consultant` en mode nomes lectura.

### 2.1 Entorn

```text
Odoo: Online / SaaS Enterprise
Versio: saas~19.3+e
```

### 2.2 Moduls rellevants instal.lats

```text
product
sale
sale_management
purchase
sale_purchase
account
web_studio
studio_customization
sale_pdf_quote_builder
```

### 2.3 Moduls rellevants NO instal.lats

```text
stock
stock_account
sale_margin
product_matrix
sale_product_matrix
```

---

## 3. Productes i variants

### 3.1 Estat funcional

- Els productes tenen variants.
- Ja existeixen productes amb moltes variants, per exemple `Panell HI-CT QuadCore` amb 360 variants.
- Els atributs principals observats son:

```text
Gruix
Chapa
Recobriment
```

- Les variants son productes concrets de `product.product`.
- El pressupost treballa contra la variant exacta.

### 3.2 Pricing de variants: decisio fase inicial

En fase inicial **no es redissenya el pricing de variants**.

Regla decidida:

```text
El sistema utilitzara el pricing actual implementat a Odoo per variants i atributs.
No es desenvolupara una logica propia de cost per variant.
Els preus/costos es prendran segons el comportament actual de productes, variants, proveidors i tarifes d'Odoo.
Qualsevol desviacio es corregira manualment al pressupost.
```

### 3.3 Com funciona ara el pricing observat

El pricing actual esta basat en el mecanisme estandard:

```text
product.template.attribute.value.price_extra
-> product.product.lst_price
-> sale.order.line.price_unit
```

Observacio important:

```text
El price_extra es per plantilla + valor d'atribut.
No es global per atribut pur.
```

Exemple auditat de `Panell HI-CT QuadCore`:

| Dada | Valor |
|---|---|
| product.template | ID 7, Panell HI-CT QuadCore |
| variants | 360 |
| categoria | Panells / Coberta |
| list_price plantilla | 0 |
| standard_price plantilla | 0 |
| proveidors | cap |
| atributs | Gruix, Chapa, Recobriment |

Variants observades:

| Variant | lst_price | standard_price | price_extra |
|---|---:|---:|---:|
| HI-CT-030-QUADCORE-55-NONE | 19.29 | 19.29 | 19.29 |
| HI-CT-030-QUADCORE-55-HDX-2C | 23.54 | 23.54 | 23.54 |
| HI-CT-030-QUADCORE-45-HDS | 20.39 | 20.39 | 20.39 |

### 3.4 Costos i proveidors actuals

Auditoria:

```text
product.supplierinfo = 0 registres
product.pricelist / product.pricelist.item = 0 registres
```

Per tant:

- No hi ha proveidors configurats.
- No hi ha preus de compra per proveidor.
- No hi ha tarifes de venda actives.
- No hi ha marge calculat.
- `standard_price` existeix, pero no es pot considerar cost fiable.
- En alguns panells observats, `standard_price` coincideix amb el preu de variant, pero aixo no es cost real.

### 3.5 Decisio sobre carrecs extra de variant

Abans de l'auditoria es va decidir funcionalment que les variants actuarien com a carrecs extra sobre cost. Despres de l'auditoria, aquesta decisio queda aparcada per fase futura.

Per fase inicial preval aquesta regla:

```text
No tocar pricing de variants.
Usar el comportament actual d'Odoo.
No crear ara cost real per variant.
```

---

## 4. Clients

### 4.1 Tipus de client

Els clients poden ser:

```text
Particular
Empresa
Professional / autonom
```

### 4.2 NIF / DNI / CIF

Regla:

```text
El NIF/DNI/CIF no es obligatori per crear client.
El NIF/DNI/CIF no es obligatori per fer pressupost.
El NIF/DNI/CIF si sera necessari abans de facturar, pero facturacio no es fase actual.
```

### 4.3 Estat comercial

Estats previstos:

```text
Potencial
Actiu
Inactiu
Bloquejat
```

Decisions:

```text
Els clients potencials poden tenir pressupostos.
Si un client esta bloquejat, no es poden enviar pressupostos nous.
Si un client passa a bloquejat, els pressupostos ja existents en esborrany es poden editar, pero no enviar.
```

### 4.4 Client i contacte al pressupost

Decisions:

```text
L'usuari tria manualment el client principal del pressupost.
Pot triar una empresa o una persona de contacte.
No es forca sempre empresa ni sempre contacte.
```

Hi haura un camp separat i editable de **persona de contacte** al pressupost.

Regles PDF:

```text
Si l'usuari selecciona una persona de contacte que pertany a una empresa:
-> el PDF mostra les dades de l'empresa
-> la persona seleccionada surt com a contacte

Si l'usuari selecciona directament una empresa:
-> no surt cap contacte per defecte al PDF
-> nomes sortira contacte si l'usuari l'ha informat al camp separat
```

### 4.5 Adreca d'entrega / obra / envio

Decisio corregida i definitiva per fase pressupost:

```text
El pressupost NO tindra camp d'adreca d'entrega.
El pressupost NO tindra camp d'obra.
El pressupost NO tindra camp ENVIO.
El PDF del pressupost NO tindra bloc ENVIO.
```

L'adreca d'entrega/obra es tractara mes endavant quan el document passi a:

```text
- comanda de venda
- factura
- logistica / entrega
```

---

## 5. PDF del pressupost: capcalera i client

### 5.1 Referencia visual

El PDF de mostra `MNL-26.2426-A` tenia a pagina 1:

```text
PRESUPUESTO
REFERENCIA: CUBIERTA
N. DOCUMENTO: MNL-26.2426-A
FECHA: 03/06/2026
```

Tambe tenia bloc `ENVIO`, pero queda descartat.

### 5.2 Organitzacio capcalera

Decisio:

```text
Empresa MNL a l'esquerra.
Bloc CLIENTE a la dreta.
Sense bloc ENVIO.
```

### 5.3 Titol del bloc client

El titol canvia segons idioma:

```text
Castella: CLIENTE
Catala: CLIENT
Angles: CUSTOMER
```

### 5.4 Dades del bloc client

El bloc client del PDF ha de mostrar sempre les linies seguents:

```text
Nom del client
Adreca fiscal
NIF/CIF
Telefon
Email
Persona de contacte
```

Regla de dades buides:

```text
Si falta una dada, la linia es mante igualment pero amb valor buit.
No s'amaga la linia.
No es mostra "pendent".
```

Exemple si falta NIF:

```text
CLIENTE
CLIENT DEMO, S.L.
C/ Exemple, 1
00000 - Ciutat de mostra
NIF:
Tlf: 000 000 000
contacte@example.invalid
Persona de contacte demo
```

---

## 6. PDF del pressupost: textos comercials

### 6.1 Validesa

Decisio:

```text
La validesa es editable per pressupost.
El valor per defecte vindra d'usuari/configuracio general.
```

No es mostrara una frase fixa llarga de validesa.

Al PDF nomes ha d'apareixer un text amb els dies de validesa, si aixi es defineix a la plantilla.

Exemple:

```text
Validez: 10 dias
Validesa: 10 dies
Validity: 10 days
```

### 6.2 Forma de pagament

Decisio inicial:

```text
La forma de pagament apareix sempre al PDF.
Si no esta informada al pressupost/client, s'omple amb una forma de pagament per defecte.
```

Decisio de Gerencia del 29/07/2026, que concreta l'anterior:

```text
La forma de pagament reutilitza directament els Many2one natius d'Odoo:
property_payment_term_id al client i payment_term_id al pressupost/comanda.
Els unics valors autoritzats son Transferencia bancaria, Rebut bancari a 30 dies i Confirming a 60 dies.
El pressupost hereta el valor del client, pero un canvi al pressupost no modifica el client.
No hi ha cap model personalitzat intermedi ni cap sincronitzacio entre dos camps de forma de pagament.
No es permeten combinacions lliures ni altres formes de pagament.
```

Implementat i validat a `provesmnl112` el 29/07/2026, inclosa la representacio a l'informe de pressupost/comanda. La primera capa personalitzada creada per error es va migrar i eliminar completament. Aquest era l'estat del 29/07. La configuració nativa de pagaments es va promoure a principal el 23/09/2026; vegeu `PRODUCTION_PROMOTION_2026-09-23.md`.

### 6.3 Dades bancaries

Decisio:

```text
Les dades bancaries nomes apareixen si la forma de pagament es transferencia.
```

### 6.4 Acceptacio i firma

Decisio:

```text
El bloc d'acceptacio i firma apareix sempre al PDF.
```

### 6.5 Distribuidor Oficial / Induspanel

Decisio fase inicial:

```text
Mantenir sempre el text/logo:
Distribuidor Oficial
www.induspanel.es
```

### 6.6 Annexos tecnics

Decisio fase inicial:

```text
No hi ha annexos tecnics de moment.
No es gestionen annexos en fase inicial.
```

Les pagines 2 i 3 del PDF de mostra no s'han de replicar ara com a annexos automatics.

---

## 7. Taula d'articles i linies del pressupost

### 7.1 Columnes PDF

Columnes confirmades:

```text
ARTICULO | UDS | LONG. | ANCHO | CANTIDAD | TOTAL | UD. | PRECIO EUR | IMPORTE EUR
```

### 7.2 Significat de preu i import

Decisio:

```text
PRECIO EUR = preu unitari
IMPORTE EUR = import total de linia/producte
```

No copiar l'ordre confus del PDF de mostra si mostrava import abans que preu unitari.

Exemple correcte:

```text
Cantidad: 700,00 M2
Precio: 8,76 EUR/M2
Importe: 6.132,00 EUR
```

### 7.3 Formules de quantitat

```text
M2:
Cantidad = UDS x Longitud x Amplada

ML:
Cantidad = UDS x Longitud

UDS:
Cantidad = UDS
```

### 7.4 Agrupacio visual

Diverses mides del mateix producte/variant es gestionen com linies normals d'Odoo amb camps d'agrupacio/classificador.

El PDF pot agrupar visualment:

```text
Producte/classificador
-> detall de mides
-> total del producte
```

### 7.5 Mateixa variant exacta

Decisio fase inicial:

```text
Una mateixa variant exacta NO es pot forcar manualment com a producte/classificador separat.
Mateixa variant exacta = mateixa agrupacio.
```

Exemple no permes en fase inicial:

```text
1.01 Panell 40 mm coberta principal
1.02 Panell 40 mm annex
```

### 7.6 Classificador

Decisio:

```text
El classificador es nomes visual de moment.
No mana la logica d'agrupacio.
La logica d'agrupacio ve de la variant/producte exacta.
```

Exemple:

```text
1.01
1.02
2.01
```

### 7.7 Decimals

Decisio:

```text
Tots els valors dimensionals i quantitats al PDF es mostren amb 2 decimals.
```

Inclou:

```text
UDS, si aplica com numero visible
LONG.
ANCHO
CANTIDAD
TOTAL
PRECIO EUR
IMPORTE EUR
```

### 7.8 Camps no aplicables

Decisio:

```text
Si LONG. o ANCHO no tenen valor aplicable, es mostra "-"
```

Exemples:

Producte per UDS:

```text
UDS: 200
LONG.: -
ANCHO: -
CANTIDAD: 200,00
```

Producte per ML:

```text
UDS: 2
LONG.: 3,50
ANCHO: -
CANTIDAD: 7,00
```

---

## 8. Camps Studio i automatitzacions existents

### 8.1 Camps Studio detectats a `sale.order.line`

| Camp | Tipus | Us |
|---|---|---|
| `x_studio_uds` | integer | Unitats base per calcul dimensional |
| `x_studio_long` | float | Longitud |
| `x_studio_ancho_1` | float | Amplada |
| `x_studio_cantidad` | float | Quantitat calculada |
| `x_studio_total` | float | Total calculat |
| `x_studio_classificador` | char | Classificador tipus 1.01, 1.02 |
| `x_studio_precio` | monetary | Marcat com "PRECIO no usar" |
| `x_studio_importe` | monetary | Marcat com "IMPORTE no usar" |

No s'han trobat camps Studio tipus:

```text
x_studio_cost
x_studio_marge
x_studio_preu
x_studio_proveidor
x_studio_variant
```

### 8.2 Automatitzacions detectades a `sale.order.line`

| Nom | Trigger | Afecta |
|---|---|---|
| Copiar cantidad inicial a UDS | on_change | Copia `product_uom_qty` a `x_studio_uds` si no hi ha dimensions |
| Calcular cantidad y total linea | on_change | Calcula `uds * long * ancho` i escriu `product_uom_qty`, `x_studio_cantidad`, `x_studio_total` |
| Assignar classificador linia | on_change | Assigna/reutilitza `x_studio_classificador` |
| Ordenar lineas por clasificador | on_create_or_write | Reordena `sequence` segons classificador |

Cap d'aquestes automatitzacions toca:

```text
price_unit
standard_price
proveidor
marge
variant pricing
```

---

## 9. Numeracio i revisio de pressupost

### 9.1 Numero visible fase 1

Format previst:

```text
MNL-YY·NNNN-A
```

Exemples:

```text
MNL-26·0001-A
MNL-26·0002-A
MNL-26·2426-A
```

En fase 1:

```text
La revisio sera A per defecte.
No s'implementa encara el salt A -> B.
```

### 9.2 Revisions fase futura

Fase 2:

```text
Boto "Crear nova revisio"
Duplicar pressupost
Mantenir numero base
Incrementar lletra A -> B -> C
Marcar revisio anterior com a substituida/superada
```

---

## 10. Portes, resum, IVA i descomptes

Les decisions de Portes, impostos i validesa es van tancar i implementar a `provesmnl112` el 29/07/2026. El resum econòmic s'ha de mostrar segons el document base: subtotals per família/capítol, base imposable, IVA i total. Decisió funcional posterior: els descomptes es representen com una línia més a la taula del pressupost i no cal repetir-los al resum final. Falta adaptar i validar-ne la implementació al PDF.

### 10.1 Decisions ja existents del document base

Del document base inicial:

```text
Ports en seccio separada "PORTES".
Ports poden ser informatius o amb import.
Si tenen import, tenen cost, marge, preu final i afecten marge real.
Calcul de ports manual en fase inicial.
Transportistes poden existir, pero no es obligatori associar-los en fase inicial.
```

Tambe ja estava definit:

```text
Descompte per linia i descompte global.
L'usuari decideix si els descomptes es mostren o no al PDF.
Els descomptes afecten el marge real.
```

La lògica genèrica de cost i marge continua fora de fase. `Portes` és una excepció funcional aprovada explícitament.

Decisió funcional posterior sobre famílies i classificadors:

```text
Fer servir la nomenclatura i l'estructura de categories que ja utilitza Odoo.
Ordenar les línies del pressupost per família/categoria i mostrar cada família com a capítol amb subtotal.
Numerar els capítols 1, 2, 3... i les línies amb el format 1.01, 1.02... dins de cada capítol.
La numeració de les línies es reinicia a .01 a cada capítol: el segon capítol comença a 2.01.
El responsable del pressupost és el comercial assignat nativament a Odoo (`sale.order.user_id`); no s'afegeix un camp MNL separat.
L'idioma del pressupost s'hereta per defecte de l'idioma del client, i es pot canviar manualment amb el desplegable ja existent a la finestra del pressupost. Els idiomes inicials documentats són castellà, català i anglès (`docs/01_Estructura_Base_Odoo_MNL.md`); cal validar que els tres estiguin disponibles i funcionin a Odoo.
La numeració visible fa servir el punt volat: `MNL-YY·NNNN-A`.
```

### 10.2 Decisions de Portes aprovades

```text
La casella "Portes" apareix sota la taula de línies del pressupost.
La configuració només es mostra quan la casella està activada.
La línia final té sempre la descripció simple "Portes".
Cada configuració referencia un proveïdor de transport.
El cost pot ser fix o variable per hores.
El cost variable aplica mínim d'hores i increments per combinat, grua i vehicle.
La zona Catalunya / Espanya / Altres s'aplica al cost fix o variable.
El preu a client pot ser fix o cost + percentatge.
La línia conserva cost, preu i marge de Portes.
Els impostos se seleccionen de la llista nativa d'Odoo.
```

Proveïdors inicials de prova:

```text
Huurre · Combinat:
  Catalunya, cost fix 250 EUR i preu fix a client 420 EUR.

Transports Borrell:
  Base 40 EUR/h + 20 EUR/h per combinat + 20 EUR/h per tràiler.
  8 hores = 640 EUR de cost.
  Cost + 20% = 768 EUR a client.
```

Configuració: `Vendes > Configuració > Proveïdors de transport`.

### 10.3 Descomptes i validesa

```text
El wizard natiu de descomptes permet seleccionar línies concretes.
El percentatge només modifica les línies seleccionades.
Els descomptes s'han de representar com una línia més a la taula del pressupost.
No cal repetir els descomptes com a partida separada al resum econòmic final.
Cal adaptar o substituir el comportament actual del wizard perquè el PDF mostri aquesta línia de descompte.
La validesa usa validity_date i el valor per defecte configurat a Odoo.
No s'ha de forçar un nombre de dies des d'una automatització MNL.
```

### 10.4 Preguntes pendents recomanades

```text
135. Tarifes comercials de client en fase inicial?
138. Revisar i aprovar el redactat final dels textos comercials en CA/ES/EN?
139. Prioritat d'implementacio fase 1?
140. Productes queda aparcat?
141. Com consolidar document final?
```

---

## 11. Coses que NO s'han de fer encara

No implementar encara:

```text
Cost real per variant
Marge objectiu / marge real calculat
Proveidor per linia
RFQ automatica
Compra automatica
Inventari
Stock
Entrega / adreca d'obra al pressupost
Annexos tecnics automatics
Product matrix
Nova logica de pricelists
Revisions A/B/C
Separacio manual de mateixa variant exacta
```

L'exclusió de cost, marge i proveïdor no afecta la implementació específica de `Portes`.

---

## 12. Objectiu tecnic immediat recomanat

Si Codex ha de continuar amb implementacio/analisi, el seguent objectiu raonable es:

```text
Preparar el pressupost PDF fase 1 sense bloc ENVIO,
amb bloc CLIENTE correcte,
amb taula d'articles neta,
amb camps dimensionals existents,
i respectant el pricing actual d'Odoo.
```

### Deliverable esperat de Codex abans de tocar res

Codex hauria de retornar:

```text
1. Quins camps actuals serveixen per cada dada del PDF.
2. Quins camps falten, si en falten.
3. Quina plantilla/report cal tocar.
4. Si sale_pdf_quote_builder pot resoldre-ho o cal QWeb/Studio.
5. Pla de proves amb un pressupost de mostra.
6. Riscos o limitacions d'Odoo Online.
```

---

## 13. Punt de continuació vigent — 14/10/2026

La pregunta 127 sobre PORTES era el punt de conversa del 08/07; les decisions posteriors del bloc 10 la superen. No reprendre aquella pregunta com si continués oberta.

L'estat conegut és el documentat el 23/09: restauració a proves i promoció a principal de pagaments, transport, quantitats, quatre informes vinculats i nivell de risc; importació de 342 contactes i alineació de 48 categories totals amb 31 subfamílies. La llista `PREUS 23/09/2026` i la seva vista només consten a proves. Principal no té proveïdors reals de transport configurats.

La feina immediata és consolidar una única plantilla de pressupost i revisar un PDF real, resoldre la fitxa estreta que no exposa les dimensions i completar la regressió ML/UDS. La regressió web del 23/09 a proves està documentada; la regressió funcional després de la promoció a principal continua pendent. No s'ha executat una auditoria Odoo nova el 14/10.

Llegeix `DEVELOPMENT_HANDOFF_2026-10-14.md`, `PRODUCTION_PROMOTION_2026-09-23.md` i `../TODO.md` per reprendre. Els registres de juliol/setembre són històrics; no reinstal·lar canvis ja desplegats sense inspecció actual.

## Decisió posterior — 19/10/2026: descomptes en standby

L’usuari ajorna els descomptes i demana amagar-ne totes les referències actuals del pressupostatge. Ocultar camps, columnes, botons, opcions globals i controls fixos del formulari a proves, conservant dades i dependències tècniques. No continuar el desenvolupament ni la validació funcional de descomptes fins que l’usuari els reprengui. Vegeu `DISCOUNTS_STANDBY_2026-10-19.md`; les definicions anteriors són referència històrica.

## Decisió posterior — 19/10/2026: PDF igual al formulari

El PDF predeterminat conservarà les files i les columnes de la finestra de pressupostatge, excloent camps interns relatius als marges i descripcions de producte. Article = nom de producte i variant, sense descripció de línia. Mateix ordre de seccions i línies, mateixes quantitats, total de variant i imports; no reagrupar les diverses mides en una línia resum nova. Conservar també les dues columnes d’unitat presents a la finestra. Aquesta decisió supera la presentació en sublínies i la descripció comercial visible establertes anteriorment. Font i validació: `QUOTATION_STANDARD_2026-10-19.md`.

## Decisió posterior — 20/10/2026: orientació vertical

El pressupost PDF predeterminat ha de ser A4 vertical. Conservar les dotze columnes de la versió aprovada, amb proporcions i capçaleres adaptades; continuen exclosos els marges interns i les descripcions de producte.

## Decisió posterior — 20/10/2026: coherència unificada

Conservar el contacte manual en el mateix desament que el client. Unificar les dades del formulari, portal i PDF amb marges només interns. Sincronitzar bidireccionalment data i frase de validesa sense regenerar la resta de condicions. Permetre esborranys incomplets i exigir dimensions positives en generar PDF: llargada/amplada en m², llargada en ml; UDS sense dimensions obligatòries. Aplicat i provat només a proves; detalls i límits a `QUOTATION_UNIFIED_2026-10-20.md`.
