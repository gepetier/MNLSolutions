# Numeració i identitat visual — 21/10/2026

Aplicat exclusivament a provesmnl1410. Referència funcional prèvia: mestre 02, apartats 9.1 i 10.1; mestre 01, apartat 6.7. El format de pressupost ja estava definit i preval sobre els exemples tècnics de proves.

## Identificadors

| Document | Regla vigent |
| --- | --- |
| Pressupost | `MNL-YY·NNNN-A`, punt volat, quatre dígits i revisió separada. Exemple `MNL-26·0030-A`. |
| Comanda de client | Conserva el número i la revisió del pressupost acceptat; no s'inventa una nova sèrie en confirmar. |
| Compra a proveïdor | Seqüència nativa purchase.order vigent, com `P00006`. No hi ha un format MNL alternatiu definit als mestres; no s'ha canviat. |
| Factura de client | Numeració del diari comptable d'Odoo; en esborrany pot no tenir número. Exemple històric configurat `INV/2026/00001`; no s'ha canviat. |

L'auditoria va trobar la seqüència de venda encara amb prefix S i cinc dígits. L'instal·lador configura `MNL-%(y)s·`, quatre dígits, sense sufix a la seqüència base; els automatismes existents afegeixen la revisió. Conserva el comptador: no reinicia ni retrocedeix números i no introdueix reinici anual no definit.

El pressupost de treball editable passa de S00030-A a MNL-26·0030-A conservant el lloc 30, quantitats i imports. La següent proposta generada nativament és MNL-26·0031-A; confirmar-la conserva aquesta referència i genera compres natives. Les referències antigues acceptades i els seus PDF no s'han reescrit. Els noms MNL-QA-* eren etiquetes explícites dels bancs anteriors, no una sèrie comercial aprovada.

Els bancs de proves deixen d'injectar MNL-QA-* al número de document: deixen numerar a Odoo i guarden la marca de prova a la nota. Per duplicar es fa servir el valor de default_get de name en l'idioma de la sessió; no escriure literalment New en un entorn traduït, perquè Odoo el pot tractar com un número manual.

## Paleta compartida entre formularis i PDF

| Tipus | Accent | Fons suau |
| --- | --- | --- |
| Pressupost | Blau original `#183c4f` | `#e9f0f3` |
| Comanda de client | Verd `#236044` | `#eaf4ed` |
| Compra a proveïdor | Ambre `#89500e` | `#fff2df` |
| Factura de client | Violeta `#593779` | `#f0eaf6` |

El formulari mostra una banda amb el nom explícit del tipus, capçaleres de taula, pestanya activa i seccions coordinades. No depèn només del color. Els colors no modifiquen estats, imports ni botons de confirmació. En una venda, el tipus canvia de blau a verd segons l'estat.

PDF MNL de pressupost: blau; reimpressió de comanda: verd; factura MNL: violeta. Els informes natius de compra hereten l'accent ambre i una banda «Compra a proveïdor». El PDF del pressupost acceptat continua blau: el context de captura de l'acceptació evita aplicar-li el verd de la comanda. Els PDF acceptats ja desats es conserven byte a byte, no es regeneren per canviar-ne el color. El report de prova v3 també té l'accent verd de comanda, sense convertir-lo en predeterminat.

## Instal·lació, validació i reversió

`ODOO_ENV_FILE=/ruta/privada.env node scripts/install_odoo_document_identity.js --apply`

Requereix els camps i vistes del flux comercial ja presents. Còpia privada a logs/odoo-document-identity-*.json; no publicar-la. Reversió amb el mateix script i `--rollback FITXER`, restaurant prefix/amplada de seqüència, vistes i asset. No es retrocedeix el comptador. La migració del pressupost editable només es reverteix si continua en esborrany, sense congelar. Usar la còpia prèvia a la primera instal·lació per retornar a l'estat original.

Verificats: numeració del pressupost editable i imports intactes; creació d'una proposta amb número natiu; mateix número en confirmar; compres amb números natius; referències acceptades anteriors i factura comptabilitzada històrica intactes. Formularis blau/verd/ambre/violeta comprovats al navegador. Generats i revisats visualment quatre PDF de proves; XML i sintaxi JavaScript comprovats. Sense comptabilitzar, confirmar compres ni enviar documents. Principal no modificada.

Per reimprimir des d'altres instal·ladors cal tornar a aplicar aquest instal·lador d'identitat si aquests han substituït vistes de formulari/report. Les plantilles MNL font ja incorporen els colors per evitar perdre'ls en reinstal·lar els informes principals.


## Menú de pressupost: Nova versió

21/10/2026, només a proves: «Duplicar» passa a «Nova versió» en formularis sale.order amb estat draft/sent. Es conserva la mateixa acció nativa de còpia; aquest canvi de text no incrementa revisions ni modifica la còpia. Comandes i altres documents conserven el text natiu. Instal·lador: `scripts/install_odoo_quotation_version_label.js --apply`, amb ODOO_ENV_FILE explícit de proves i còpia privada prèvia. Reversió: desactivar l’actiu `MNL - Nova versió al menú de pressupost` o restaurar la còpia. Comprovació focalitzada: etiquetes per estat/model i callback natiu preservat; sintaxi JS correcta. Recarregar el navegador després d’aplicar.
