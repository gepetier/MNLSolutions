# Increment percentual sobre base — 21/10/2026

Decisió de l’usuari: el camp de marge percentual comercial és un increment sobre el preu base. Fórmula: preu final = base × (1 + percentatge / 100). Exemple: 100 € + 20% = 120 €. Increment nominal = final − base; percentatge = nominal / base × 100, amb zero com a valor de representació quan la base és zero.

Aplicat només a provesmnl1410 a les quatre accions que comparteixen mnl_profit_values, tant UI com persistència. Es manté la sincronització entre euros i percentatge i la precisió nativa de preus; s’admeten increments del 100% o superiors. Recalculats els dos pressupostos editables amb línies inicialitzades. Documents acceptats i transport dedicat preservats: el percentatge informatiu del transport continua sent un indicador separat sobre venda.

Font de la funció desplegada: scripts/assets/quote_profit_values.py. Instal·lació amb còpia privada: ODOO_ENV_FILE explícit de proves, node scripts/fix_odoo_profit_markup.js --apply. Sense --apply mostra preview. Reversió de codi i ajuda de camps restaurant la còpia privada; revisar els pressupostos editables recalculats abans de retornar a la fórmula anterior. No restaurar documents congelats.

Validació: onchange real de línia sense desar amb base 100 i percentatge 20 retorna preu 120 i nominal 20. Proves de la funció per increment nominal, zero, 100% i modificació coherent dels dos camps. Comprovador de coherència adaptat al percentatge sobre base. La representació percentual pot variar lleugerament per l’arrodoniment natiu del preu final.
