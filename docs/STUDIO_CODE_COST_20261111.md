# Retirada de codi Studio — estat verificat el 11/11/2026

Branca: `fix/studio-code-cost-20261111`. Còpia consultada: `provesmnl1410`, en lectura. Aquest lliurament no ha modificat proves ni principal.

| Acció Python | Automatització vinculada | Estat observat | SHA-256 del codi llegit |
| --- | --- | --- | --- |
| 820 | 73 | Inactiva; codi present; sense vinculació directa a menú | `38cd639ad32dbcefa6f1f82f6d61e61bcb75677dd3c209c7cad266e1cb01b3c7` |
| 821 | 74 | Inactiva; codi present; sense vinculació directa a menú | `bf69f7d4901587b7bb3da693c9ab46c18854af17697d43286796ab12c8937c59` |

Evidència: lectura RPC de `ir.actions.server` (820/821) i `base.automation` (73/74). Cap acció tenia el marcador de retirada. El commit `e739a8a` de la branca `audit/code-cost-20261105` aporta `scripts/prepare_inactive_validity_retirement.js`, un preparador de proposta en lectura. El commit `4432e5d` és el punt de partida d’aquesta branca. No s’ha localitzat cap commit local que acrediti l’aplicació de la retirada.

No s’ha mesurat el recompte oficial de línies ni s’ha acreditat cap estalvi. Que l’automatització estigui inactiva no demostra que el seu codi estigui exclòs del recompte. La comprovació d’avui no descarta crides indirectes ni externes.

Abans d’aplicar res: confirmar la còpia neutralitzada, revisar totes les dependències i els callers, capturar el recompte oficial i preparar una còpia privada del codi original amb empremtes. Si s’autoritza la retirada, fer-la a proves, repetir les regressions de validesa, acceptació i PDF, comprovar el recompte oficial i assajar la reversió. Per revertir una eventual retirada, restaurar el codi original a les mateixes accions a partir de la còpia privada i comprovar les empremtes. Ara no hi ha cap canvi Odoo per revertir.
