# Banc de proves del pressupostatge — 20/10/2026

## Abast i conclusió

Executat sobre el pressupost únic de treball de `provesmnl1410`, amb dades fictícies. Les modificacions funcionals i la restauració s’han fet des de la interfície del navegador, sense escriure els valors del pressupost per RPC. La lectura RPC s’ha utilitzat per contrastar persistència. Els informes s’han renderitzat al servidor amb l’eina existent, que crea i elimina una acció i adjunts temporals.

Els càlculs dimensionals, els imports, els marges comercials assajats, les variants i el transport coincideixen després de desar. Hi ha una fallada de persistència del contacte quan s’editen client i contacte en el mateix desament. També s’han reproduït dos casos de contingut incomplet/contradictori i una diferència entre el portal i el PDF.

No s’ha corregit la implementació funcional durant el banc: els resultats fallats continuen pendents. Principal sense canvis; pressupost sense enviar, confirmar ni signar. Descomptes sense activar.

## Casos funcionals executats

Els canvis s’han agrupat en checkpoints. Alguns checkpoints acumulen modificacions de files diferents; no es presenten com a execucions aïllades. La restauració final es compara amb la fotografia inicial.

| Cas | Acció per interfície | Resultat observat | Estat |
| --- | --- | --- | --- |
| C01 | Panells: 12 → 13 peces, 6 × 1 m | 78 m²; total de variant 121,13; import de fila 1.435,20 | Correcte en UI, BD i PDF |
| C02 | Tornar a 12 peces; longitud 6,125 i amplada 1,100 | 80,85 m²; total de variant 123,98; import 1.487,64 | Correcte en UI, BD i PDF |
| C03 | Remat: 10 peces, longitud 3 → 3,125 m | 31,25 ml; total de variant 40,75; import 398,44 | Correcte en UI, BD i PDF |
| C04 | Fixacions: 240 → 250 peces | Quantitat 250; total de variant 310; import 120,00 | Correcte en UI, BD i PDF |
| C05 | Afegir marge nominal 2,60 a base 18,40 | Preu final 21,00; marge sobre venda 12,3810% | Correcte en UI, BD i PDF |
| C06 | Introduir marge percentual 20% sobre base 18,40 | Preu final 23,00; nominal 4,60 | Correcte en UI, BD i PDF |
| C07 | Base de façana 20,80 → 22,40, 32 m² | Preu final 22,40; import 716,80 | Correcte en UI, BD i PDF |
| C08 | Configurador natiu: gruix 30 → 50 mm | Base 21,05; conserva nominal 2,60; final 23,65. Separa total 72 de les altres dues mides (43,13), renumera classificadors | Correcte en UI, BD i PDF |
| C09 | Transport per hores: 2 h, mínim 4, combinat i tràiler | Cost 4 × (40 + 20 + 20) = 320; preu 384 | Correcte en UI; checkpoint posterior de transport a BD/PDF |
| C10 | Activar grua; passar a 6 h; repetir amb 5 h | Amb mínim 4 h + grua: 528; amb 6 h: cost 660/preu 792; amb 5 h: cost 550/preu 660 | Correcte després de confirmar el camp i completar el recàlcul; 6 h contrastades amb BD/PDF |
| C11 | Seleccionar el contacte fill com a client | Mostra dades fiscals de l’empresa i conserva el contacte correcte en desar | Correcte en UI, BD i PDF |
| C12 | Idioma català → castellà | Capçaleres del PDF en castellà; no tradueix el text manual d’acceptació | Correcte per a etiquetes; text lliure requereix revisió |
| C13 | Transferència → Confirming | Canvia el termini; el PDF deixa de mostrar les dades bancàries | Correcte en UI, BD i PDF |
| C14 | Validesa 19/11 → 04/12 | El camp i el PDF passen a 04/12; el text manual continua dient 19/11 | Avís: incoherència comercial reproduïda |
| C15 | Introduir marge del 100% | Odoo rebutja el valor amb un missatge i es descarta el canvi. No es desa ni es genera PDF invàlid | Correcte |
| C16 | Posar longitud zero en una línia de panells | Quantitat i import zero; permet desar i renderitzar sense avís específic de línia incompleta | Avís: manca validació prèvia al PDF; enviament no assajat |
| C17 | Eliminar la sublínia de 60 fixacions | Total de variant baixa de 310 a 250; desapareix la fila del PDF | Correcte en UI, BD i PDF |
| C18 | Afegir de nou el mateix article amb 60 unitats | Inicialitza article, unitat i preu; comparteix classificador; total de variant torna a 310 | Correcte en UI, BD i PDF |
| C19 | Canviar contacte-client a empresa i triar contacte manual abans d’un únic desament | Abans de desar es veu el contacte seleccionat; després de desar el camp queda buit i el PDF també | Fallada de persistència reproduïda |

En C10 es va observar un valor anterior mentre hi havia recàlcul pendent. Una repetició confirmant el camp amb Tab va retornar el valor correcte. No s’ha acreditat una fallada persistent del càlcul de transport i no s’ha corregit cap automatització per aquesta observació.

## Incidències i prioritats

1. **Contacte perdut en desar (C19).** Revisar l’acció de persistència d’herència del client: la regla torna a proposar contacte buit per a una empresa i pot substituir la selecció manual enviada en la mateixa operació. És una hipòtesi coherent amb el codi auditat; la prova acredita la pèrdua, no la correcció. Solució provisional comprovada: desar primer el client i després seleccionar/desar el contacte en una operació independent.
2. **Portal divergent.** El botó `Vista previa` obre el portal estàndard: reapareixen descripcions, falta el detall de dimensions i les seccions mostren imports sense IVA, mentre el formulari en mostra amb IVA. El total global coincideix. El portal manté textos natius de condicions i pagament diferents del PDF MNL. Cal decidir si s’adapta el portal o si s’ofereix una previsualització directa del PDF aprovat.
3. **Validesa contradictòria (C14).** Evitar duplicar dates dins textos manuals, usar un marcador o avisar quan la data redactada no coincideix amb `validity_date`. No sobreescriure textos manuals sense una regla explícita.
4. **Línies incompletes (C16).** Afegir una comprovació abans de generar/enviar el document per dimensions no positives, quantitats nul·les i condicions incompletes. El banc no ha enviat pressupostos per provar el bloqueig d’enviament.
5. **Arrodoniment global d’IVA.** Diferència de 0,01–0,02 entre suma de files amb IVA i total global en els checkpoints. Conservar el càlcul fiscal natiu; acordar una representació conciliada. No és un descompte.

## PDF i límits de la comprovació

- 12 PDF diferents generats des d’Odoo després dels canvis i desaments: units, dimensions, ml-uds, pricing, variant, transport, commercial, zero-length, delete-line, add-line, restored i final.
- Tots són A4 vertical d’una pàgina. Base, IVA i total del text extret coincideixen amb la fotografia de BD corresponent.
- L’HTML de cada informe es contrasta amb les línies desades: ordre/IDs, 12 cel·les per fila, quantitats, totals de variant, preus i imports. Comprovades 143 files de producte entre els 12 informes. Sense columnes internes de marge ni descripcions comercials de producte. Les notes explícites es conserven.
- PDF final renderitzat a imatge i revisat visualment: client/contacte, taula, totals, pagament, validesa i signatura llegibles.
- Botó real `Imprimir`: primer intent amb pestanya en blanc; en un segon intent esperant l’esdeveniment de descàrrega s’obté un resultat de descàrrega. El camí retornat no queda accessible al directori compartit, de manera que **no s’ha pogut comparar el contingut d’aquella descàrrega** amb el PDF renderitzat per l’eina. No presentar aquesta ruta com a verificada de cap a cap.
- No s’han assajat multipàgina, anglès, canvis fiscals/moneda, enviament, confirmació, firma ni concurrència entre usuaris.

## Com repetir el banc

1. Seleccionar explícitament la còpia de proves; localitzar el pressupost únic de treball, conservar una fotografia privada de capçalera/línies i confirmar estat esborrany.
2. Fer cada canvi amb els controls natius del formulari. Sortir del camp i esperar el recàlcul complet; comprovar fila, resta de mides de variant, secció i totals abans de desar.
3. Desar i tornar a llegir el document. No usar una escriptura API com a substitut de la prova d’interfície.
4. Executar `node scripts/snapshot_odoo_quotation_readonly.js ID_PRESSUPOST`: només llegeix i desa la fotografia a `outputs/quotation-bench/`, ignorat per Git, amb forma `{"order": {...}, "lines": [...]}`. Inclou camps natius i MNL de quantitat/import/variant. Les fotografies de l’execució inicial són a `audit-private/bench` fora del repositori.
5. Executar `python scripts/check_quotation_coherence.py FOTO_PRIVADA.json`. Els errors numèrics retornen codi 1; els avisos de dades incompletes o dates manuals discordants s’informen separadament. Aquest comprovador està destinat al flux dimensional MNL amb descomptes ajornats, no a bestretes o factures.
6. Renderitzar amb `scripts/render_odoo_quotation_preview.js`, seleccionant l’ID del pressupost i una sortida privada/ignorada. Executar `python scripts/check_quotation_preview.py INFORME.html FOTO_PRIVADA.json`; extreure també el text del PDF per contrastar totals i revisar-ne visualment el resultat.
7. Restaurar les dades de partida per la interfície; comparar capçalera, contingut de línies i imports. No exigir el mateix ID intern a una fila eliminada i recreada.

El comprovador nou s’ha executat sobre les 13 fotografies del banc, sense errors numèrics; detecta els avisos dels casos C14/C16. També s’han injectat quatre corrupcions en còpies en memòria (quantitat nativa, còpia de quantitat, còpia d’import i total de variant) i les quatre s’han detectat. Això valida el comprovador i no compta com a prova d’interfície.

## Estat final

Restaurats client empresa, contacte, català, transferència, validesa de 30 dies, articles, mides, quantitats, classificadors i imports inicials. Un desament independent del contacte resol l’estat del document després de reproduir C19, però no corregeix la regla. La sublínia reposada té un ID intern nou. Continuen existint un únic pressupost en esborrany i les dades fictícies auxiliars autoritzades. Cap dada privada, captura, credencial, JSON de pressupost ni PDF s’ha afegit al repositori.

## Seguiment posterior del mateix dia

Els punts de contacte, portal, validesa i dimensions s’han corregit després del banc inicial. Vegeu `QUOTATION_UNIFIED_2026-10-20.md` per les proves noves i els límits pendents. Les incidències anteriors descriuen el comportament anterior a la correcció.
