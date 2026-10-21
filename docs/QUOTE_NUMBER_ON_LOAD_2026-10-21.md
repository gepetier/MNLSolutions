# Referència i revisió en obrir pressupost — 21/10/2026

Aplicat només a provesmnl1410. L’automatització UI 83 tenia els camps on_change_field_ids buits i l’acció 831 només iterava records, sense recollir record del formulari nou. Ara observa name/company_id i processa el registre virtual amb retorn action.value. No crea ni desa pressupostos.

Reserva la seqüència nativa MNL-YY·NNNN i mostra revisió A abans de desar. Una segona crida conserva el número; els pressupostos existents no es renumeren. Descartar el formulari consumeix el número reservat; no es rebobina la seqüència.

Reproducció: ODOO_ENV_FILE seleccionat explícitament, node scripts/install_odoo_quote_number_on_load.js. Crea còpia privada de l’acció i automatització abans d’aplicar. Reversió: restaurar code i on_change_field_ids/trigger_field_ids de la còpia; mai restaurar el comptador.

Validació: node scripts/test_odoo_quote_number_on_load.js passa sobre onchange inicial sense desar i segona crida sense nova reserva. La prova consumeix un número i no crea documents. Principal sense canvis. Recarregar Odoo per renovar la definició onchange del navegador.
