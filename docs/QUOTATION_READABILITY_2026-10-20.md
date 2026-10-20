# Revisió visual del pressupost — 20/10/2026

Decisions posteriors a la revisió de coherència, aplicades només a `provesmnl1410`.

- Amagar temporalment Total quantitat/Total variant en formulari, detall de línia, portal i PDF. El camp i el càlcul es conserven. El document extern passa de 12 a 11 columnes; 12 línies de producte en el pressupost de prova.
- Longitud (m) i Amplada (m), mantenint tres decimals. Capçaleres abreujades i lletra de taula ampliada de 8,6 a 9,4 px en el PDF.
- Prova provisional de separació entre variants exactes i codi SKU sota el nom a la primera fila de cada bloc. No fusiona files. Context `mnl_quotation_visual_trial=False` desactiva conjuntament aquests dos elements; l’usuari encara no n’ha aprovat la presentació definitiva.
- Resum d’impostos des de `tax_totals` natiu: nom/grup i import, amb IVA 21% en la mostra. No recalcular impostos ni inventar un tipus fix.
- Correccions de presentació catalana: FAÇANA, Transferència bancària i Distribuïdor oficial. Es conserven els noms mestres existents a la BD.
- Odoo té acceptació i signatura natives des del portal. En la mostra `require_signature=True`, `require_payment=False`, sense signatura registrada. El document indica aquesta via; si s’emet un pressupost sense signatura en línia es reserva espai manual. No s’ha signat, acceptat ni confirmat cap document.
- IBAN i arrodoniment d’IVA ajornats explícitament per l’usuari. No reprendre’n les propostes en aquesta passada. La nota de proves conserva la part d’IVA i deixa de referir-se a la columna amagada.

Validació: PDF MNL d’una pàgina A4 vertical revisat visualment; onze cel·les per fila i imports coincidents amb la fotografia de BD, sense marges ni descripcions. Portal real amb onze capçaleres, dotze files i sense diàlegs d’error. Total conservat: 6.244,83 €. Formulari comprovat després de recarregar per renovar la memòria cau de vistes. Fonts QWeb/formulari, instal·lador i comprovador actualitzats. Backups privats a `logs/`; revertir amb `scripts/install_odoo_standard_quotation.js --rollback RUTA_BACKUP` en la mateixa base.

Font funcional de signatura: https://www.odoo.com/documentation/saas-19.3/applications/sales/sales/send_quotations/get_signature_to_validate.html . La configuració del pressupost s’ha comprovat directament en lectura; el flux complet de signatura continua pendent de prova.
