# Auditoria de rearrencada — 16/09/2026

> Registre històric. Per l’estat de represa actual consulta [CONTEXT_INDEX.md](CONTEXT_INDEX.md), el TODO i la promoció del 23/09. No interpretar aquest diagnòstic datat com una lectura actual d’Odoo.


## Entorn

- Base de proves vigent: `provesmnl202609`.
- Origen: còpia neutralitzada de `mnl-technical-consultant`.
- Odoo: `saas~19.3+e`.
- Auditoria executada exclusivament en lectura.

## Resultats

### Catàleg

- Catàleg local: 5.220 variants.
- Catàleg Odoo: 5.220 coincidències exactes.
- 0 variants per crear, 0 per actualitzar i 0 sobrants.

### Formes de pagament

- La còpia conserva els terminis genèrics de la principal, no la configuració autoritzada que s'havia instal·lat a l'antiga base de proves.
- No hi ha accions de pagament personalitzades actives.
- Distribució actual dels 14 pressupostos/comandes: 8 amb `30 Days`, 3 amb `Immediate Payment` i 3 buits.

### Portes

- No existeixen els models, camps, productes ni proveïdors de transport configurats a l'antiga base de proves.
- Existeixen els impostos de venda `21% S` i `21% G`.

### Automatitzacions i validesa

- Hi ha 23 automatitzacions actives.
- Continuen actives `MNL - Recalcular venciment per validesa` i la seva versió UI, que forcen 30 dies mitjançant camps Studio.
- Continuen actives `MNL - Persist dimensions and line amount TEST` i `TEST2`; cal consolidar-les abans d'una regressió fiable.
- El valor natiu `sale.default_quotation_validity_days` és buit.

### PDF de pressupost

- Existeixen les quatre vistes QWeb MNL A, B, C i D.
- Existeixen quatre accions d'informe MNL, però cap té `binding_model_id`; no apareixen com a informe vinculat de `sale.order`.
- La plantilla D encara conté el bloc d'enviament i cap plantilla està consolidada com a definitiva.

## Conclusió

La còpia nova és una base segura per treballar, però reflecteix l'estat de la principal i no incorpora els darrers canvis que només vivien a `provesmnl112`. Abans d'abordar el PDF cal reconstruir de manera controlada la configuració de proves: consolidar automatitzacions, restaurar pagaments autoritzats i restaurar `Portes`, amb backup, prova i rollback a cada pas.

## Recuperació executada

Recuperació aplicada exclusivament a `provesmnl202609` el 16/09/2026:

- Restaurats els tres terminis natius autoritzats: `Transferència Bancaria`, `Confirming 60 dies` i `Rebut bancari 30 dies`.
- Migrades les referències existents de `30 Days` a `Rebut bancari 30 dies`; la resta de terminis genèrics han quedat inactius.
- Restaurades les vistes restringides de pagament del client i del pressupost.
- Validada l'herència client → pressupost, el canvi local al pressupost i la persistència en confirmar.
- Restaurat `Portes`: model de proveïdor, camps, producte `MNL-PORTES`, vistes, accions, menú i dos proveïdors d'exemple.
- Validades les tarifes Huurre i Borrell, impostos, descompte selectiu i eliminació de la línia de Portes.
- Desactivades les automatitzacions antigues que forçaven la validesa i confirmat l'ús de la validesa nativa d'Odoo.
- Consolidat el pipeline de quantitats i desactivades les automatitzacions duplicades `TEST` i `TEST2`.
- Validats els càlculs UDS i m². ML continua pendent d'una prova amb un producte comercial real configurat en aquesta unitat.
- Vinculades les quatre accions d'informe MNL a `sale.order` sense sobreescriure les vistes QWeb; les quatre accions retornen correctament una acció `qweb-pdf`.
- Confirmat que no queden clients, productes ni pressupostos temporals de les proves automàtiques.

A 16/09 continuaven pendents la selecció d'una única plantilla PDF, la revisió visual manual del PDF definitiu i la regressió funcional des de la interfície d'Odoo; aquesta última es va iniciar el 23/09.

## Regressió web del 23/09/2026

Prova feta directament a la interfície de `provesmnl202609`. Pressupost de prova conservat com a evidència: [REGRESSIO-WEB-20260923-A](https://provesmnl202609.odoo.com/odoo/sales/20), client de prova (identitat omesa); continua en estat pressupost, sense enviar ni confirmar.

- Panell `HI-CT-030-PIR-55-NONE`: 22 unitats × 6 m × 1,15 m = 151,80 m². Preu 17,15 €/m², descompte 5 %, base 2.473,20 €. Els valors persisteixen després de recarregar la pàgina.
- A la fitxa estreta de la línia no apareixen els camps d'unitats, longitud i amplada. En introduir 151,80 directament a `Cantidad` i aplicar Portes, el pipeline va recalcular la línia a 0 perquè les tres mides eren buides. Els camps sí que apareixen a la taula de línies en vista d'escriptori; omplint-los, la quantitat i l'import es recuperen correctament. El descompte inicial també va tornar a 0 en aquest primer guardat i es va haver de tornar a introduir a la taula.
- Portes Huurre · Combinat, Catalunya: cost 250 €, preu 420 €. Portes Borrell, Catalunya, combinat, 8 h i tràiler: cost 640 €, preu 768 €. Després de Borrell, base total 3.241,20 € i total amb IVA 3.921,85 €, persistents en recarregar.
- El classificador posa el panell a `1 · COBERTA`, però en aplicar Portes creava dues seccions consecutives `2 · SENSE FAMILIA` i `2 · 2 · SENSE FAMILIA`. S'ha corregit el 23/09.
- La validesa nativa del pressupost mostra 23/10/2026, 30 dies des de la prova.
- A Comptabilitat → Configuració → Condicions de pagament, la interfície en castellà mostrava `Pago inmediato`, `15 días` i `21 Días`. L'auditoria per API va confirmar que els tres terminis autoritzats **no s'havien perdut**: els registres natius continuaven actius amb els noms correctes en anglès i els venciments 0/60/30 dies. El problema eren les traduccions antigues en castellà i català, corregides el 23/09. El pressupost hereta ara visiblement `Transferència Bancaria` i el desplegable ofereix els tres terminis autoritzats.
- La interfície mostra que la prova gratuïta caducarà en 8 dies (avís observat el 23/09/2026).

### Correccions aplicades el 23/09/2026

- Ajustades les traduccions dels tres terminis en `es_ES` i `ca_ES`, sense alterar-ne els identificadors, els venciments ni les referències existents. L'instal·lador també sincronitza ara aquestes traduccions en futures reinstal·lacions.
- L'automatització de seccions elimina els prefixos numèrics repetits del nom de família abans de classificar i reaprofitar una secció. S'ha retirat només la secció duplicada del pressupost de regressió.
- Verificació a la web: `1 · COBERTA` i `2 · SENSE FAMILIA` apareixen una sola vegada, el total segueix sent **3.921,85 €** i el desplegable de pagament mostra `Transferència Bancaria`, `Confirming 60 dies` i `Rebut bancari 30 dies`. L'override a `Rebut bancari 30 dies` persisteix després de recarregar; s'ha restaurat i verificat el valor inicial `Transferència Bancaria`.
- S'ha desat una còpia de l'estat anterior de les dades afectades a `logs/odoo-restart-regressions-backup-provesmnl202609-2026-09-23T16-09-23-530Z.json`. Cap canvi a la base principal.
