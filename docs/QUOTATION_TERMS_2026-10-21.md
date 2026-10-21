# Termes del pressupost — 21/10/2026

Aplicat només a proves: text comercial provisional al camp natiu sale.order.note del pressupost de treball 59. La plantilla predeterminada imprimeix aquest camp HTML en una segona pàgina abans de l’acceptació i signatura. Font d’11 px. La plantilla v3 del repositori també incorpora el bloc; la vista v3 amb la clau prevista no existeix en aquest entorn i no s’ha creat ni canviat el report predeterminat.

Inclou validesa, abast, revisió de mides, modificacions, subministrament, transport, recepció, conservació i pagament. El text és provisional per treballar sobre el pressupost de proves; no configura condicions generals d’empresa ni pressupostos futurs. No s’han alterat documents acceptats ni PDFs congelats. Import del pressupost verificat sense canvis.

Aplicació: ODOO_ENV_FILE explícit de proves i node scripts/install_odoo_quotation_terms.js --apply. Sense --apply només preview. Còpia privada de note i arch_db a logs abans d’escriure; per revertir, restaurar aquests camps de la còpia al mateix entorn i només si el pressupost continua editable.

Validació: sintaxi JS/XML, import conservat i PDF generat amb el bloc de condicions.


Ajust de padding del 21/10: capçalera d’empresa/client i metadades amb 10 px verticals i 12 px laterals; cel·les de la taula estàndard amb 4 px laterals; condicions de pagament i acceptació amb separació interior. Mateixes columnes, camps i imports. Instal·lació específica sense tocar dades: `scripts/install_odoo_quotation_padding.js --apply`, amb còpia privada prèvia dels arch_db. Per revertir, restaurar els arch_db de la còpia.
