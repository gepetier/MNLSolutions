# Neteja i proveïdor de panells — 21/10/2026

Aplicat només a provesmnl1410 amb autorització de l’usuari. Arxivats quatre productes identificats explícitament per MNL-QA/NO REAL o PROVA/MNL-DEMO. S’han conservat els documents que els referencien. No s’han arxivat productes tècnics d’Odoo ni articles de naturalesa ambigua.

No existia contacte Hurre/Huurre: creat Hurre amb el nom indicat per l’usuari, sense NIF, adreça ni altres dades inventades. Assignat com a proveïdor natiu preferent a les 14 plantilles actuals de panells de façana i coberta, que cobreixen 5.220 variants. Regles a nivell de plantilla, sense restringir variant, quantitat mínima zero i sense dates de vigència. Prioritat anterior a qualsevol regla existent; compres habilitades. Aquesta assignació cobreix el catàleg actual, no imposa un proveïdor als futurs productes.

No s’han inventat tarifes: les regles noves tenen preu zero i els esborranys de compra les marcaran com a pendents de revisió segons el flux vigent. Cap compra confirmada ni enviada. Els accessoris, remats i transport requereixen la seva configuració de proveïdor pròpia.

Script: scripts/clean_odoo_test_catalog.js, preview per defecte; --apply només amb ODOO_ENV_FILE explícit de proves. Còpia privada abans de modificar i registre dels identificadors creats. Reversió: restaurar active/purchase_ok i les prioritats originals; retirar les regles creades només després de revisar les compres que hi puguin estar vinculades. No esborrar el contacte si ja té documents associats.

Validació: quatre productes arxivats; una regla preferent de Hurre aplicable a totes les variants en cadascuna de les 14 plantilles; recompte de 5.220 variants actives. Sintaxi JS correcta.
