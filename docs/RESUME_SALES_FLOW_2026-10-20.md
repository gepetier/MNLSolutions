# Punt de represa — flux comercial — 20/10/2026

La incidència de bloqueig ha quedat resolta i verificada: la prova repetia False sobre un document ja desbloquejat; amb bloqueig inicial True el canvi és rebutjat. La comanda fictícia s'ha tornat a bloquejar. També s'han verificat protecció del PDF i còpia a nou esborrany editable.

Estat, decisions, validació i límits: [registre d’implementació](SALES_ORDER_INVOICE_FLOW_IMPLEMENTED_2026-10-20.md). Flux desplegat exclusivament a proves: pressupost acceptat congelat → comanda bloquejada → factura total en esborrany → comptabilització manual.

Es conserva l’exemple agrupat de dues comandes fictícies acceptades i una factura en esborrany; el pressupost de treball original continua editable. Sense enviaments ni comptabilitzacions.

Pendents funcionals: prova real de signatura de client al portal; traducció de les etiquetes de factura; definició de bestretes, parcials, rectificatives i cancel·lació d’acceptats. Principal no modificada.


### Interfície de factura revisada — 20/10/2026

Aplicada a proves: títols de secció amb origen recuperats, article ampli, columnes ordenades, dimensions no aplicables amb guió i lateral plegable. Línies acceptades de només lectura al formulari. Sense canviar dades comercials ni comptabilitzar. Vegeu INVOICE_INTERFACE_2026-10-20.md.


## Compres automàtiques en esborrany — 21/10/2026

Implementat i provat només a proves: producte de venda nou amb proveïdor natiu obligatori; confirmació genera una RFQ per proveïdor i comanda, amb dimensions i vincles natius. Sense confirmar ni enviar compres. Els productes antics sense proveïdor queden bloquejats en confirmar fins que es configurin; no s’han inventat dades. Vegeu PURCHASE_FLOW_2026-10-21.md.

Decisió de factura vigent: una comanda pot generar diverses factures, però cada factura prové d’una sola comanda. L’adaptació del flux anterior de factura total/agrupada continua pendent; no confondre-la amb el flux de compres ja provat.
