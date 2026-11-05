# Auditoria externa de codi

`scripts/audit_code_cost.py` llegeix un dump PostgreSQL de còpia de seguretat.
No executa SQL ni codi extret, no contacta amb Odoo i no hi instal·la res.

Executa'l amb `dump.sql`, `--output` apuntant a una carpeta privada fora de Git,
`--block-rate` amb la tarifa contractual mensual per cent línies i, si està
disponible, `--official-total` amb el recompte actual del menú **Count LoC**.
`--previous` accepta l'inventari anterior per detectar canvis.

El resultat Python reprodueix l'algoritme AST i els criteris d'origen de
`odoo/tools/cloc.py`, branca `saas-19.3`. No substitueix el recompte oficial:
cal comprovar separadament QWeb i adjunts de mòduls importats, mòduls del sistema
de fitxers, exclusions i errors. L'estat inactiu d'una automatització no exclou
el Python de la seva acció del recompte. Un canvi de quota requereix confirmació
comercial sobre l'import i la data d'efecte.

Els JSON, CSV, fonts, còpies i historials generats són privats. No els publiquis
en aquest repositori. `technical.json` és metadada tècnica sense filtrar i pot
incloure noms d'adjunts; revisa'l abans de compartir qualsevol exportació.

La monitorització ha d'usar Count LoC o extraccions externes de lectura. No
instal·lis cap acció Python, camp calculat o cron per auditar el propi cost.
Registra per base: data, recompte oficial, empremtes de components, activació,
desencadenants, blocs, tarifa, quota observada i data efectiva acordada amb Odoo.
Els errors d'accés són dades desconegudes, mai zero línies ni absència de canvis.

Qualsevol retirada requereix conservar l'original amb empremta, revisar crides
des d'accions/vistes/automatitzacions, autorització concreta, assaig en còpia
neutralitzada i validació abans/després. Eliminar o compactar lògica només per
baixar el recompte pot causar regressions; no usar exclusions artificials.
