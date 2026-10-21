# Pressupost → Comanda → Factura: auditoria en lectura — 20/10/2026

## Abast i evidència

Petició de l’usuari: començar a plantejar el flux i analitzar el que existeix. Autoritza anàlisi de la fase següent, sense implicar una implementació ni facturació real aprovades.

Auditada exclusivament `provesmnl1410`, amb consultes de lectura. Cap confirmació, factura nova, comptabilització, pagament ni enviament. Eina reproduïble: `scripts/audit_odoo_sales_invoice_flow_readonly.js`, ODOO_ENV_FILE explícit de proves; sortida privada a `outputs/sales-invoice-flow` o MNL_FLOW_AUDIT_OUTPUT. Aquesta execució va reintentar una consulta d’informes que havia rebut HTML transitori; l’evidència privada final inclou tots els apartats. No versionar les fotografies.

Estat observat: un pressupost en esborrany sense factures vinculades, cap comanda confirmada, una factura històrica comptabilitzada i no pagada, sense enllaços actuals de línia de venda. Aquesta factura es va conservar en eliminar les restes de proves i no acredita el flux end-to-end actual. Signatura en línia activada al pressupost, pagament en línia desactivat.

## Base nativa existent

Pressupost i comanda són el mateix `sale.order`: draft/sent → sale. No s’ha de crear un clon comercial paral·lel per representar la comanda. La confirmació nativa escriu estat sale i una nova date_order de confirmació. Cal conservar separadament la data d’emissió si ha de continuar visible com a data de pressupost.

Factura: `account.move`, línies `account.move.line`, amb relació nativa `sale_line_ids` amb les línies de comanda. `invoice_origin` és text informatiu; no substitueix la relació. Una comanda pot originar diverses factures i una factura pot reunir diverses comandes. No imposar una relació 1:1 si s’han de permetre bestretes, parcials o agrupacions.

En el codi natiu de saas-19.3, la preparació de factura inclou client de facturació, moneda, impostos/posició fiscal, comercial, empresa, origen i termini de pagament. Les línies inclouen producte, unitat, quantitat pendent de facturar, preu, impostos, descompte i vincle a la línia de venda. No es va executar la preparació/creació contra la BD: és anàlisi de codi, no prova funcional de còpia.

Les 20 plantilles de producte actives venibles de la còpia usen `invoice_policy=order` (quantitats demanades): 17 de tipus béns no gestionats en estoc i 3 serveis. Això és coherent amb poder preparar factura un cop confirmada la comanda sense esperar una entrega registrada; encara no s’ha comprovat amb una confirmació real del pressupost de mostra. No confondre aquestes 20 plantilles amb el nombre de variants.

Mòduls instal·lats: Vendes, Comptabilitat, Compres, enllaç Venda/Compra, Studio, Sign, marges, constructor PDF i localització espanyola. Inventari/Stock i sale_stock no apareixen instal·lats. Cap proveïdor natiu seller_ids als productes venibles inspeccionats. La configuració pròpia del transport és separada; no acredita una compra ni una entrega natives automàtiques.

## Mancances i riscos concrets

1. **Bloqueig de comanda.** La funcionalitat nativa de bloquejar després de confirmar està desactivada, comprovat per la pertinença del superusuari al grup que consulta `_is_feature_enabled`. La vista permet editar order_line llevat de cancel·lació o locked. El pipeline no té el mateix abast després de confirmar: la persistència de línia pot continuar recalculant la quantitat dimensional, mentre marges, resums MNL i agrupació tenen guards draft/sent. La combinació pot permetre alterar quantitats acceptades i deixar representacions auxiliars desalineades. És un risc deduït del codi i configuració; no s’ha provocat una incoherència en una comanda real.
2. **Validació abans de confirmar.** La validació dimensional actual es crida des de QWeb al generar PDF/portal. No s’ha trobat enganxada a action_confirm. La validació nativa inspeccionada no coneix els camps MNL. Cal cobrir confirmació manual i signatura del portal, no només impressió.
3. **Dimensions a factura.** Cap camp x_ a account.move ni account.move.line i cap automatització activa en aquests models. Tampoc vistes actives trobades que recuperin x_studio_long a través de sale_line_ids. La quantitat calculada pot passar nativament (p. ex. 72 m²), però no hi ha una còpia implementada d’UDS, llargada, amplada, classificador, contacte separat o idioma específic del document.
4. **Document de comanda.** La substitució del PDF natiu i del portal està limitada a draft/sent. En sale tornen al disseny natiu. L’informe directe Pressupost MNL continua vinculat a sale.order i el títol de la plantilla és de pressupost. Per tant no hi ha una presentació de comanda única i validada. La v3 és només una prova PDF, no el predeterminat.
5. **Factura visual.** A la còpia hi ha els informes natius i una còpia Studio anomenada prueba1. Kawabunga té codi històric al repositori però no consta com a informe instal·lat vigent en aquesta auditoria. Cap plantilla de factura equivalent a la de pressupost està consolidada.
6. **Textos i client.** La factura nativa copia note, mentre que les condicions manuals MNL estan en x_studio_condicions_acceptacio. Cal decidir quines condicions comercials han d’arribar a factura. El contacte i idioma específics no tenen destinació MNL equivalent; el nom intern de la línia de transport pot continuar sent Portes encara que el producte es mostri Transport.
7. **Validació fiscal funcional.** El mestre estableix exigir identificació fiscal abans de facturar, però no hi ha validació MNL activa de factura que ho implementi. És una regla funcional pendent del projecte, no una conclusió sobre obligacions legals ni una auditoria de conformitat fiscal.
8. **Numeració i revisions.** La referència/revisió MNL encara té automatismes de canvi sense restricció equivalent a estat esborrany. Definir què es congela en acceptar i què es fa davant canvis posteriors. La factura ha de conservar numeració comptable pròpia i el vincle a la comanda.

L’arxiu històric personalitzat existent és un model separat; no equival al circuit de facturació comptable en account.move.

## Proposta per començar

1. Definir l’acceptació: Confirmar manualment o signatura en línia; conservar el mateix registre de venda i bloquejar-ne les condicions comercials acceptades. Conservar data original d’emissió i data de confirmació diferenciades.
2. Completar i provar validacions de confirmació i document de comanda, mantenint les mateixes línies, dimensions, transport, impostos i pagament.
3. Crear factura en esborrany des de la comanda. Implementar el mapa de camps amb còpia de les dimensions/identificació acceptades i relació nativa a línia, evitant que una factura ja emesa canviï de contingut perquè s’edita posteriorment una comanda/producte.
4. Revisió manual abans de comptabilitzar; no afegir validació ni enviament automàtics de factures en aquesta primera implementació.
5. Banc específic: total, bestreta i liquidació, parcial, cancel·lació/rectificació, doble clic/reintent sense duplicats i modificacions posteriors. Les polítiques per a aquests casos continuen pendents d’acord amb l’usuari.

Primera proposta d’abast: acceptació → comanda bloquejada → factura total en esborrany revisable. Bestretes/parcials entren després si el negoci les necessita; conservar compatibilitat nativa des del principi. Compres, aprovisionament i entregues es planifiquen separadament, ja que la còpia no té Inventari instal·lat.

## Fonts tècniques consultades

- https://www.odoo.com/documentation/19.0/applications/sales/sales/sales_quotations/create_quotations.html
- https://www.odoo.com/documentation/19.0/applications/sales/sales/invoicing/invoicing_policy.html
- https://raw.githubusercontent.com/odoo/odoo/saas-19.3/addons/sale/models/sale_order.py : action_confirm, _prepare_confirmation_values, _prepare_invoice.
- https://raw.githubusercontent.com/odoo/odoo/saas-19.3/addons/sale/models/sale_order_line.py : _prepare_invoice_line.
- https://raw.githubusercontent.com/odoo/odoo/saas-19.3/odoo/addons/base/models/res_groups.py : _is_feature_enabled.

Configuració i personalitzacions contrastades amb consultes de la mateixa còpia el 20/10/2026. Cap resultat d’aquesta auditoria s’ha d’atribuir a principal.
