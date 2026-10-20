# Protocol de desenvolupament, qualitat i consum de Work

**Vigent des de:** 20/10/2026. **Estat:** protocol proposat en PR; només és obligatori un cop fusionat i configurades les proteccions de branca.

## Objectiu

Fer canvis petits, reproduïbles i auditables sense gastar la quota de ChatGPT Work repetint navegacions o comprovacions deterministes. Aquest repositori conté codi local JS/Electron i scripts Odoo, però **no** tot l'estat d'Odoo Online/Studio: GitHub Actions no pot acreditar que una vista o PDF d'Odoo real sigui correcte.

## Qui fa què

| Responsable | Funció | Evitar |
| --- | --- | --- |
| Codex / agent de codi | Implementar canvis, proves, refactors i diagnòstic local | Navegació manual repetitiva |
| GitHub Actions | Sintaxi, proves unitàries, smoke HTTP local i control de rutes sensibles | Secrets, accés a Odoo, dades reals |
| Work | Investigar fluxos complexos, coordinar, inspecció visual puntual, resumir evidències i bloquejos | Regenerar totes les proves manuals a cada canvi |
| Persona responsable | Aprovar requisits, PDFs definitius i qualsevol escriptura a principal | Donar per aprovats canvis no verificats |

## Circuit obligatori per cada canvi

1. **Definir abast i acceptació.** Una funció/defecte per canvi; descriure quin comportament canvia i quin es conserva. Si el canvi és a Odoo, identificar la còpia neutralitzada *vigent* (els noms dels docs poden haver caducat).
2. **Reproduir primer.** Per errors: cas mínim i prova que falli abans de corregir quan sigui possible. No usar clients, pressupostos ni credencials reals en fixtures.
3. **Branca curta i PR.** Treballar fora de `main`, commits coherents, PR amb impacte, proves, captures sanejades si fan falta, riscos i rollback.
4. **Porta automàtica sense xarxa Odoo.** Executar `npm run check:ci`. GitHub Actions ho repeteix a cada PR i push a `main`. Un error implica no fusionar fins corregir-lo.
5. **Porta Odoo condicional.** Si es toca Odoo/Studio, QWeb, impostos, pagaments o quantitats, fer lectura/preview amb l'entorn explícit i validar en una còpia de proves *vigent* abans de promoure. Si afecta documentació comercial, contrastar formulari, portal i PDF amb les mateixes dades.
6. **Revisió.** Adjuntar resultats (data, entorn, identificador de prova intern, comprovacions i limitacions) sense dades personals. Preparar rollback i obtenir aprovació expressa abans de qualsevol escriptura a principal.
7. **Tancar el bucle.** Actualitzar `TODO.md`, handoff vigent i instruccions afectades. No anomenar «validat» res comprovat només en simulació.

## Matriu de validació

| Tipus de canvi | CI GitHub | Odoo neutralitzat | Humà |
| --- | --- | --- | --- |
| Càlculs i catàleg JS locals | Obligatori | Quan es propaga a Odoo | Només si impacta oferta |
| UI local Electron/web | Obligatori + smoke local | Si modifica dades Odoo | Visual dels fluxos canviats |
| Camps Odoo, Studio, automatitzacions | Regressions locals si es pot | **Obligatori** | Autorització abans de principal |
| Plantilla pressupost / portal / QWeb | Tests d'estructura locals quan existeixin | **Obligatori** amb pressupost sintètic | Comparar portal, formulari i PDF |
| Canvis de preus, marges o impostos | Tests numèrics amb fixtures | **Obligatori** | Revisió de totals i autorització |

### Casos mínims pendents de convertir en tests Odoo

- Unitats sense dimensions: es permeten camps dimensionals buits.
- m²: llargada i amplada positives si es requereixen; metres lineals: llargada positiva.
- Editar una vista i recuperar el pressupost: els valors persisteixen i les dues visualitzacions mantenen sincronització.
- Import net, impostos i total coherents entre formulari, portal i PDF; la versió de client no exposa marges ni descripcions internes.
- Dates de validesa, condicions comercials, textos i pagaments coherents entre interfícies.
- PDF vertical i llegible amb línies llargues, múltiples partides, descomptes, idiomes i pàgines.
- Les comprovacions reals han de contrastar també l'arrodoniment de `price_unit` a Odoo quan s'hi reparteixen extres.

Els scripts existents `scripts/test_odoo_quote_template_actions.js` i `scripts/test_odoo_quote_template_pdfs.js` necessiten credencials i un ID real de pressupost de proves. **No s'executen en CI**, ni s'han de tractar com a tests offline.

## Política de consum eficient d'agents

- Primer cerca al codi, logs, fixtures i diffs; utilitza Work/navegador només quan l'observació visual o l'accés real aportin evidència nova.
- Passar de l'anàlisi a la implementació amb abast tancat; evitar tornar a llegir tot el repositori o executar suites completes després de cada microcanvi.
- Reutilitzar una mateixa fixture sintètica i la sortida de CI. Si falla, repetir *només* el test afectat fins corregir-lo i passar la suite completa al final.
- Màxim dues exploracions manuals idèntiques sense nova hipòtesi o canvi de codi; llavors documentar el bloqueig i canviar d'estratègia.
- Per a PDF, prioritzar validació de dades/estructura automatitzada. Fer una passada visual representativa després d'un canvi significatiu de plantilla, no una per cada camp.
- Tancar cada sessió amb estat confirmat, diff/PR, resultats reals i següents passos, perquè un agent nou no hagi de reconstruir el treball.

## Comandes i garanties

```bash
npm run check           # comprovació de sintaxi JS
npm test                # node:test, fixtures sense dades reals
npm run safety:check    # noms/rutes sensibles entre els fitxers versionats
npm run check:ci        # totes les portes offline
```

Node.js 22, runner Linux. La primera fase no necessita `npm install` per als tests i **mai** rep secrets de GitHub Actions. El control de rutes sensibles és preventiu, no és un escàner exhaustiu de secrets ni neteja contingut ja publicat a la història Git. Una persona ha de revisar els diffs, especialment en un repositori públic.

## Configuració manual a GitHub després d'activar el PR

A `Settings → Branches` o `Rulesets` de `main`:
- Exigir PR abans de fusió.
- Exigir el check `Proves locals i seguretat` (un cop hagi executat la primera vegada).
- Bloquejar force-push i eliminació de `main`.
- Preferir squash merge per mantenir canvis petits i historial llegible.

**No s'ha configurat aquesta protecció automàticament.** La CI valida el codi local, però no modifica Odoo; tampoc garanteix que totes les dades de producció siguin consistents. Per ampliar cobertura, introduir Playwright en un entorn de proves estable i amb dades sintètiques, separat del CI públic, després de definir fixtures i accessos restringits.
