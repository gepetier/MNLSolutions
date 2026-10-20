# Punt de represa — flux comercial — 20/10/2026

La incidència de bloqueig ha quedat resolta i verificada: la prova repetia False sobre un document ja desbloquejat; amb bloqueig inicial True el canvi és rebutjat. La comanda fictícia s'ha tornat a bloquejar. També s'han verificat protecció del PDF i còpia a nou esborrany editable.

Estat, decisions, validació i límits: [registre d’implementació](SALES_ORDER_INVOICE_FLOW_IMPLEMENTED_2026-10-20.md). Flux desplegat exclusivament a proves: pressupost acceptat congelat → comanda bloquejada → factura total en esborrany → comptabilització manual.

Es conserva l’exemple agrupat de dues comandes fictícies acceptades i una factura en esborrany; el pressupost de treball original continua editable. Sense enviaments ni comptabilitzacions.

Pendents funcionals: prova real de signatura de client al portal; traducció de les etiquetes de factura; definició de bestretes, parcials, rectificatives i cancel·lació d’acceptats. Principal no modificada.
