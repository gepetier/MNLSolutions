# Odoo MNL — Estructura base

**Versió original:** 0.2
**Data de consolidació:** 8 de juliol de 2026
**Restaurat des de l'historial del projecte:** 15 de juliol de 2026

> Document base per definir la implementació gairebé des de zero d'Odoo per a una empresa de compravenda de materials de construcció.

## 1. Objectiu i abast

L'abast immediat de la fase inicial se centra en tres blocs:

1. Productes.
2. Clients.
3. Pressupostatge.

Compres, RFQ, inventari i facturació queden fora del desenvolupament inicial, excepte les decisions estructurals imprescindibles per evitar incompatibilitats futures.

## 2. Entorn Odoo

- Odoo Online Enterprise `saas~19.3+e`.
- Mòduls actius rellevants:
  - `product`
  - `sale`
  - `sale_management`
  - `purchase`
  - `sale_purchase`
  - `account`
  - `web_studio`
  - `studio_customization`
  - `sale_pdf_quote_builder`
- Mòduls no instal·lats en el moment de la definició:
  - `stock`
  - `stock_account`
  - `sale_margin`
  - `product_matrix`

## 3. Model comercial inicial

- MNL treballa principalment sota comanda: es compra material quan el client confirma la necessitat.
- El possible stock propi futur no ha de condicionar ni bloquejar la fase inicial.
- Un producte creat des d'un pressupost queda guardat al catàleg, actiu i disponible immediatament per a tots els usuaris.
- No hi haurà estat «pendent de revisar» per als productes creats des del pressupost durant la fase inicial.

## 4. Productes

### 4.1. Catàleg i famílies

- El catàleg combinarà productes habituals i productes especials creats durant el pressupostatge.
- Cada producte tindrà una categoria.
- L'organització funcional principal serà la família comercial: coberta, façana, remats, cargoleria, canalons o altres famílies que es vagin definint.
- Queda pendent decidir si la categoria d'Odoo i la família comercial seran exactament el mateix concepte.

### 4.2. Tipus de càlcul

Cada producte indicarà un tipus de càlcul de quantitat:

| Tipus | Càlcul |
| --- | --- |
| m² | `UDS × Long × Ancho` |
| metres lineals | `UDS × Long` |
| unitats | `UDS` |

### 4.3. Variants

- Les variants estàndard d'Odoo s'utilitzaran per combinar atributs com Gruix, Chapa, Recobriment, color, llargada o acabat.
- Una variant exacta és un producte diferenciat a efectes de pressupostatge.
- Cada variant ha de tenir una descripció comercial pròpia visible al pressupost; no n'hi ha prou amb heretar la descripció comuna de la plantilla.
- La fase inicial aprofitarà el mecanisme natiu de preus addicionals per atributs i variants.
- No es crearà una lògica paral·lela pròpia de cost per variant mentre no hi hagi tarifes de proveïdor fiables.

Flux de preu natiu de referència:

```text
product.template.attribute.value.price_extra
    -> product.product.lst_price
    -> sale.order.line.price_unit
```

`standard_price` no es considera encara una font fiable del cost real.

## 5. Clients

### 5.1. Tipus i estat comercial

- Tipus de client:
  - Particular.
  - Empresa.
  - Professional.
- Estat comercial:
  - Potencial.
  - Actiu.
  - Inactiu.
  - Bloquejat.
- Un client bloquejat no podrà generar nous pressupostos.

### 5.2. Persona, empresa i contacte

- El client pot ser una persona o una empresa.
- Si es tria una persona vinculada a una empresa, el PDF mostrarà les dades de l'empresa i la persona escollida com a contacte.
- Si es tria directament una empresa, no s'assignarà obligatòriament cap contacte per defecte.
- El contacte del pressupost serà editable.
- Cada client pot tenir diversos contactes: administració, cap d'obra, comprador, gerent o altres.
- El contacte principal s'heretarà al pressupost per defecte quan existeixi.

### 5.3. Adreces i dades comercials

- Un client pot tenir diverses adreces d'obra o entrega guardades.
- Cada pressupost seleccionarà una única adreça d'obra o entrega.
- Es diferenciarà l'adreça fiscal de l'adreça d'obra o entrega.
- El responsable intern del client s'heretarà al pressupost i serà editable.
- Idiomes inicials de documentació: castellà, català i anglès.
- L'idioma per defecte vindrà del client i es podrà modificar al pressupost.
- NIF, DNI o CIF no serà obligatori per crear un client ni un pressupost, però sí abans de facturar.
- La forma de pagament del client s'heretarà al pressupost i serà editable.
- El client podrà tenir una tarifa o llista de preus assignada.

## 6. Pressupostatge

### 6.1. Camps principals de línia

| Etiqueta | Camp |
| --- | --- |
| UDS | `product_uom_qty` |
| Long | `x_studio_long` |
| ANCHO | `x_studio_ancho_1` |
| CANTIDAD | `x_studio_cantidad` |
| TOTAL | `x_studio_total` |
| Classificador | `x_studio_classificador` |

La línia també mostrarà article, unitat, preu unitari i import total.

### 6.2. Famílies i classificadors

- Les línies s'agruparan principalment per família comercial.
- Les famílies o capítols es crearan dinàmicament segons els productes afegits.
- L'ordre inicial serà el d'aparició i es podrà editar manualment dins del pressupost.
- Cada família tindrà subtotal.
- El classificador visual tindrà format `1.01`, `1.02`, etc.
- El classificador s'assignarà dins de cada capítol segons l'ordre dels productes.
- Reordenar famílies o productes recalcularà els classificadors.
- El classificador és visual i no determina la lògica d'agrupació.

### 6.3. Agrupació i sublínies

- Mateix producte significa mateixa variant exacta.
- Variants diferents tindran classificador propi.
- Afegir una mida nova d'una variant ja existent reutilitzarà el mateix classificador.
- Durant la fase inicial no es podrà forçar manualment que una mateixa variant exacta aparegui com un producte separat.
- Les diferents mides es mostraran com a sublínies sota una línia resum de producte.
- Les sublínies mostraran UDS, longitud, amplada i quantitat.
- El preu unitari i l'import es mostraran a la línia resum del producte.
- El TOTAL de producte serà la suma de la quantitat de les seves sublínies.

### 6.4. Cost, preu i marge

- El cost intern de cada sublínia vindrà inicialment de la tarifa o del preu del proveïdor associat.
- Si hi ha diversos proveïdors, es proposarà el principal i l'usuari podrà seleccionar-ne un altre.
- El cost pot variar segons origen, stock o proveïdor.
- El preu final de venda es calcularà amb el cost unitari de la sublínia més cara i el marge objectiu.
- Canviar el proveïdor de línia recalcularà el preu de venda.
- El marge objectiu vindrà de la família comercial o del producte quan tingui un valor específic.
- El marge es copiarà a la línia i serà editable.
- Editar manualment el preu de venda recalcularà el marge real, mantenint el marge objectiu com a referència.
- Inicialment no hi haurà bloquejos ni avisos automàtics quan el marge real quedi per sota de l'objectiu.

### 6.5. Descomptes i imports

- Hi haurà descompte de línia i descompte global.
- Els descomptes afectaran sempre el marge.
- La visibilitat dels descomptes al PDF serà configurable per pressupost.
- Al PDF final:
  - `PRECIO €` mostrarà el preu unitari.
  - `IMPORTE €` mostrarà l'import total de la línia o producte.

### 6.6. Format i textos

- Dimensions i quantitats es mostraran amb 2 decimals.
- Els camps sense valor es mostraran com `–`.
- La forma de pagament, la validesa, les condicions i l'acceptació es proposaran des d'una plantilla segons l'idioma.
- Aquests textos seran editables a cada pressupost.
- Validesa per defecte: 30 dies.
- Al PDF s'expressarà en dies, per exemple: «Oferta válida durante 30 días».
- No s'implementaran línies opcionals durant la fase inicial.
- El camp REFERENCIA es proposarà automàticament i serà editable.

### 6.7. Numeració i revisions

- Fase 1: numeració automàtica simple amb revisió `A` per defecte.
- Format: `MNL-YY·NNNN-A`.
- Fase 2 pendent: revisions comercials A/B/C mitjançant una acció «Crear nova revisió», conservant el número base, duplicant línies i marcant l'estat de la revisió anterior.

## 7. PDF de client

El PDF inclourà:

- Capçalera amb dades de MNL, client i document.
- Adreça fiscal.
- NIF si existeix.
- Telèfon i correu electrònic.
- Persona de contacte.
- Adreça d'obra o entrega seleccionada.
- Taula detallada de línies i sublínies.
- Secció específica de portes quan correspongui.
- Subtotals per capítol.
- Base imposable, IVA i total.
- Forma de pagament.
- Condicions d'acceptació i signatura.

Quan falti una dada, se'n conservarà l'etiqueta amb el valor buit.

## 8. Integració futura amb compres

Decisions estructurals previstes:

- Confirmar el pressupost generarà propostes o RFQ de compra separades per proveïdor.
- L'usuari revisarà les RFQ abans de confirmar-les com a comandes.
- Les línies de compra conservaran el detall de mides.
- El classificador del pressupost es mantindrà internament per traçabilitat, però no es mostrarà al PDF o correu enviat al proveïdor.
- No cal mostrar el termini del proveïdor al pressupost intern durant la fase inicial.

## 9. Pendents

- Definir els factors exactes de les tarifes i la seva relació amb el marge.
- Decidir si categoria de producte i família comercial seran el mateix camp.
- Definir avisos o bloquejos per marge insuficient.
- Estudiar agrupacions futures per zona o criteri manual.
- Desenvolupar línies opcionals en una fase posterior.
- Desenvolupar el sistema de revisions comercials A/B/C en fase 2.

