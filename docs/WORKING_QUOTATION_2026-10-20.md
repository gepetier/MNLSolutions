# Pressupost únic de treball — 20/10/2026

L’usuari autoritza eliminar tots els pressupostos anteriors de proves perquè són restes de validacions. Operació limitada a `provesmnl1410`.

- Eliminats els 20 documents de venda anteriors, cancel·lant prèviament els que ho requerien. La factura vinculada a una de les comandes es conserva amb el mateix estat i import.
- Creat un únic pressupost en esborrany, sense enviament ni confirmació, amb empresa i contacte ficticis identificats com a prova, idioma català, transferència i validesa de 30 dies.
- Casos: panells de coberta i façana en m²; diverses mides de la mateixa variant; remats en ml; fixacions en unitats; transport combinat amb tarifa d’exemple; seccions i nota informativa. Sense descomptes.
- Creats dos articles de demostració amb SKU `MNL-DEMO-REMAT-ML` i `MNL-DEMO-FIXACIO-UD`. No són tarifes comercials reals. El producte intern Portes s’ha classificat a Transport combinat a proves i la seva fila s’ha situat al final dels articles.
- Les quantitats natives s’arrodoneixen a dos decimals: per exemple, una superfície exacta de 7,125 m² es desa com a 7,13 m². Les còpies de quantitat/import i el total de variant s’han contrastat amb els camps natius.
- L’empresa usa `round_globally`: la suma dels imports amb IVA arrodonits per fila difereix 0,02 € del total global del pressupost. La nota del document explica el criteri. Pendent decidir com representar aquesta conciliació sense alterar el càlcul fiscal natiu.

Les discrepàncies trobades el 20/10 als documents antics no acrediten que el nou flux les continuï generant. Fer les pròximes proves sobre aquest pressupost únic; no recuperar els documents antics com a casos de treball actius. La comprovació de lectura no substitueix provar nous canvis des de la interfície.

Backups, dades i evidències: carpeta privada `audit-private` de la sessió. No versionar-ne els fitxers. Principal sense canvis.
