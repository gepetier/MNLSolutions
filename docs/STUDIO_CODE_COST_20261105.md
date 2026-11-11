# Retirada del codi Studio facturable de principal — 05/11/2026

Destinació **`mnl-technical-consultant`**, Odoo Online Enterprise. Retirada aplicada el **05/11/2026** mitjançant els formularis tècnics natius d'Odoo. L'optimització de `provesmnl1410` del mateix dia és una operació separada.

## Recompte oficial i quota

| Data | Lectura del menú Count LoC | Línies facturables |
| --- | --- | ---: |
| 05/11/2026 | Abans de la retirada a principal | 729 |
| 05/11/2026 | Després de retirar els 26 cossos Python, amb les nou fórmules encara presents | 60 |
| 05/11/2026, 23:01 CET | Després de retirar les nou fórmules | **0** |
| 06/11/2026, 08:37 CET | Comprovació posterior en lectura | **0** |

Les 729 línies es repartien entre 669 d'accions i 60 de camps calculats. La tarifa de 12 € per bloc de 100 línies equivalia a 96 €/mes de manteniment abans de la retirada. El portal encara mostrava 96 €/mes el 06/11. En la comprovació autenticada posterior, va mostrar **0 €/mes de manteniment** i **27,90 €/mes sense IVA** de subscripció total (33,76 € amb IVA). La primera factura amb el nou import i la data efectiva del canvi comercial queden pendents de contrast.

## Objectes modificats

| ID | Tipus de registre | Model afectat | Nom | Línies abans | Canvi aplicat |
| ---: | --- | --- | --- | ---: | --- |
| 808 | `ir.actions.server` | `sale.order.line` | MNL - UI recalculate line dimensions | 19 | Python substituït per un comentari |
| 809 | `ir.actions.server` | `sale.order.line` | Ejecutar código | 9 | Python substituït per un comentari |
| 810 | `ir.actions.server` | `sale.order.line` | Ejecutar código | 34 | Python substituït per un comentari |
| 811 | `ir.actions.server` | `sale.order.line` | Ejecutar código | 28 | Python substituït per un comentari |
| 812 | `ir.actions.server` | `sale.order` | MNL · Inicialitzar pressupost | 42 | Python substituït per un comentari |
| 813 | `ir.actions.server` | `sale.order` | MNL · Bloquejar pressupostos de clients bloquejats | 3 | Python substituït per un comentari |
| 814 | `ir.actions.server` | `sale.order` | MNL - Sync reference from order name action | 26 | Python substituït per un comentari |
| 815 | `ir.actions.server` | `sale.order` | MNL - Sync order name from reference action | 23 | Python substituït per un comentari |
| 816 | `ir.actions.server` | `sale.order` | MNL - Sync order name from revision action | 25 | Python substituït per un comentari |
| 817 | `ir.actions.server` | `sale.order` | MNL - UI sync reference from order name action | 28 | Python substituït per un comentari |
| 818 | `ir.actions.server` | `sale.order` | MNL - UI sync order name from reference action | 25 | Python substituït per un comentari |
| 819 | `ir.actions.server` | `sale.order` | MNL - UI sync order name from revision action | 27 | Python substituït per un comentari |
| 820 | `ir.actions.server` | `sale.order` | MNL - Recalcular venciment per validesa action | 24 | Python substituït per un comentari |
| 821 | `ir.actions.server` | `sale.order` | MNL - UI recalcular venciment per validesa action | 23 | Python substituït per un comentari |
| 822 | `ir.actions.server` | `sale.order.line` | MNL - Recalcular classificador i familia en editar linia action | 65 | Python substituït per un comentari |
| 823 | `ir.actions.server` | `sale.order.line` | MNL - UI recalcular classificador i familia en linia action | 29 | Python substituït per un comentari |
| 824 | `ir.actions.server` | `sale.order.line` | Ejecutar código | 24 | Python substituït per un comentari |
| 825 | `ir.actions.server` | `sale.order` | MNL - Recalculate MNL totals | 13 | Python substituït per un comentari |
| 826 | `ir.actions.server` | `sale.order` | MNL - UI recalculate MNL totals | 7 | Python substituït per un comentari |
| 828 | `ir.actions.server` | `sale.order` | MNL - Aplicar descompte fix | 46 | Python substituït per un comentari |
| 829 | `ir.actions.server` | `sale.order` | MNL - Desactivar descompte fix | 13 | Python substituït per un comentari |
| 830 | `ir.actions.server` | `sale.order.line` | MNL - UI quantitat minima en seleccionar producte | 11 | Python substituït per un comentari |
| 831 | `ir.actions.server` | `sale.order` | MNL - UI reservar numero en nou pressupost | 13 | Python substituït per un comentari |
| 832 | `ir.actions.server` | `sale.order` | MNL - Aplicar Portes | 80 | Python substituït per un comentari |
| 833 | `ir.actions.server` | `sale.order` | MNL - Treure Portes | 17 | Python substituït per un comentari |
| 834 | `ir.actions.server` | `sale.order.discount` | MNL - Aplicar descompte a línies seleccionades | 15 | Python substituït per un comentari |
| 21246 | `ir.model.fields` (camp calculat) | `sale.order.line` | `x_studio_cantidad` | 13 | `compute` i `depends` buidats |
| 21248 | `ir.model.fields` (camp calculat) | `sale.order.line` | `x_studio_total` | 8 | `compute` i `depends` buidats |
| 21373 | `ir.model.fields` (camp calculat) | `sale.order.line` | `x_studio_tipus_calcul` | 5 | `compute` i `depends` buidats |
| 21375 | `ir.model.fields` (camp calculat) | `sale.order.line` | `x_studio_preu_suggerit` | 4 | `compute` i `depends` buidats |
| 21377 | `ir.model.fields` (camp calculat) | `sale.order.line` | `x_studio_marge_real` | 4 | `compute` i `depends` buidats |
| 21380 | `ir.model.fields` (camp calculat) | `sale.order.line` | `x_studio_importe_mnl` | 5 | `compute` i `depends` buidats |
| 21382 | `ir.model.fields` (camp calculat) | `sale.order` | `x_studio_base_mnl` | 7 | `compute` i `depends` buidats |
| 21385 | `ir.model.fields` (camp calculat) | `sale.order` | `x_studio_iva_mnl` | 12 | `compute` i `depends` buidats |
| 21387 | `ir.model.fields` (camp calculat) | `sale.order` | `x_studio_total_mnl` | 2 | `compute` i `depends` buidats |

Les 26 accions conserven el registre i el tipus «Executar codi». El cos actual és el comentari `# Retirat 2026-11-05`. Els nou camps conserven el tipus i `store=True`, amb els valors emmagatzemats. Les 23 regles `base.automation` de referència conserven el seu estat d'activació. Aquesta operació tampoc va modificar vistes QWeb ni informes.

Les dues automatitzacions de validesa (IDs 73 i 74) ja eren inactives. Les seves accions (820 i 821) continuen existint. Els cossos originals sumaven 47 línies tot i que les regles eren inactives. Retirar aquests cossos les va deixar a zero. El mateix criteri s'aplica a les altres accions que encara existeixen.

## Impacte funcional i validació

El Python retirat calculava les quantitats en m², ml i unitats, la quantitat mínima inicial, les agrupacions per variant, les famílies i els classificadors. També actualitzava el preu suggerit, el marge real, els descomptes, la base, l'IVA i el total MNL. Gestionava el transport, la inicialització del client, el contacte i l'idioma, el bloqueig de clients, la reserva de numeració i la sincronització de referència i revisió. El venciment MNL corresponia a les dues regles ja inactives.

Els càlculs MNL retirats deixen d'actualitzar-se automàticament. Els controls de transport i descomptes poden continuar visibles amb accions sense efecte. Els informes poden mostrar valors MNL emmagatzemats. Els imports natius d'Odoo segueixen el seu propi càlcul.

- **Visual, 05/11.** Es va verificar el desament dels formularis, el Count LoC abans, durant i després, i l'obertura d'un pressupost existent sense diàlegs d'error. La llista de vendes era accessible.
- **Lectura posterior, 06/11.** Es va verificar que les 26 accions tenien el comentari i que les nou definicions tenien la fórmula i les dependències buides.
- **API i regressió funcional.** No es va executar una regressió per API ni una prova de creació o edició de pressupostos a principal. Queden per validar el PDF i el flux comercial complet amb les regles que substituiran el codi retirat.

## Eines i traçabilitat a Git

L'eina de l'auditoria prèvia [audit_code_cost.py](../scripts/audit_code_cost.py) ja era a la branca de partida. Llegeix la còpia privada i ajuda a contrastar el recompte oficial. [Instruccions de l'auditoria](CODE_COST_AUDIT.md).

La retirada efectiva es va fer amb exportacions i formularis natius. L'intent d'importació es va interrompre abans de confirmar-la. L'arxiu massiu de regles es va descartar i la reversió no es va executar. No consta cap script de retirada o de reversió executat contra principal. Els prototips de la branca d'auditoria per a la 1410 no formen part del procediment aplicat a principal.

El punt de partida Git disponible és `4432e5dd4d67d39c430a7c1b735d94e81e66c221`, a `audit/code-cost-20261105`. Les edicions manuals d'Odoo no van generar un commit propi.

## Evidència privada

Fitxers per conservar a `MNL_SENSITIVE_DATA_DIR`:

| Fitxer | SHA-256 |
| --- | --- |
| `Reversio_codi_principal_MNL_20261105.zip` | `0731f426a7fe9f4c4ffc5ae6a3b3391515a5704225499c4de9306d99b50abbae` |
| `Retirada_codi_principal_MNL_20261105.md` | `614fc6f71d45c3fe8c11a98a65356ba76e4b27cc7a0974536c989953ddba3ca5` |
| `Odoo_MNL_historial_cost_codi.json` | `90be3cad7c68d1ff1562f4a972efa0add5b7ea49de569179a27e78f7f6b78e9d` |

## Reversió

1. Recupera el ZIP privat i verifica'n el SHA-256. Prepara una còpia neutralitzada de principal i comprova que els IDs, els noms, els models i els tipus coincideixen amb el manifest.
2. Als mateixos nou camps, restaura `compute` i `depends` a partir del ZIP i mantén `store=True`. Comença pels camps de línia i continua amb els totals del document. Comprova les recomputacions i els valors en la còpia.
3. Restaura els 26 cossos Python als seus registres originals. Fes-ho des dels formularis o assaja abans el CSV de reversió del ZIP, que identifica els registres pels IDs externs i conté només l'identificador i el codi. Comprova que es tracta d'actualitzacions de registres existents.
4. Conserva l'estat d'activació de les regles i verifica les vinculacions amb les accions. En particular, mantén inactives les regles 73 i 74.
5. Prova pressupostos nous i existents a la còpia. Revisa quantitats, marges, agrupació, descomptes i impostos, transport, client bloquejat, referència, validesa, revisions i PDF. Repeteix el Count LoC. Si l'estat de partida coincideix amb el del 05/11, restaurar aquest codi reintroduirà les 729 línies.
6. Aplica la reversió a principal només després de validar l'assaig i obtenir l'aprovació per a aquest canvi. Verifica de nou els valors dels camps, el recompte i l'efecte sobre la quota.

## Pendents

- Contrastar la primera factura amb manteniment a 0 € i qualsevol ajust de factures anteriors.
- Recuperar a l'aplicació externa els càlculs i les validacions MNL necessaris. Validar l'accés API, la sincronització de quantitats i imports, la gestió d'errors parcials i la coherència amb els totals natius.
- Revisar els controls MNL visibles que ara no executen càlculs i fer la regressió visual i per API en una còpia, incloent PDF, acceptació, comanda i factura en esborrany.
- Assajar la reversió en una còpia neutralitzada.
