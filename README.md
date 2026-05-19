# Automatitzacio amb Holded

Base minima per connectar amb l'API de Holded i començar a automatitzar tasques d'una petita empresa: clients, productes, factures i documents.

## 1. Preparar la clau

1. A Holded, ves a `Configuracio > Desenvolupadors`.
2. Crea una nova API Key.
3. Copia `.env.example` a `.env`.
4. Posa la clau real a `HOLDED_API_KEY`.

Important: segons la documentacio de Holded, nomes la primera API Key pot tenir lectura i escriptura. Les seguents poden quedar nomes en lectura.

## 2. Provar la connexio

```bash
npm run holded:ping
```

Si la clau es correcta, hauries de veure una resposta JSON amb dades de contactes.

## 3. Comandes disponibles

```bash
npm run holded:contacts
npm run holded:products
npm run holded:invoices
node src/cli.js documents:list estimate
node src/cli.js contacts:create examples/contact.sample.json
node src/cli.js products:create examples/product.sample.json
node src/cli.js documents:create invoice examples/invoice.sample.json
```

## 4. Configurador compacte

La carpeta `data/catalog.json` guarda:

- panells base: `HI-CT`, `TZ-CR`, `HI-XT`
- nuclis: `PIR`, `PIRM`, `QuadCore`
- gruixos i preus base per m2
- recarrec/descompte de chapa respecte a `5/5`
- recobriments especials per m2
- extres amb unitat propia

Aixo evita crear totes les combinacions com a articles de Holded.

Obrir eina local:

```bash
cmd /c npm run dev
```

URL:

```text
http://localhost:4173
```

Obrir com a app d'escriptori amb Electron:

```bash
npm install
cmd /c npm run electron
```

Generar `.exe` per Windows:

```bash
cmd /c npm run electron:build
```

La versio Electron arrenca un servidor intern privat a `127.0.0.1` i permet usar la integracio amb Holded sense exposar la key en una web publica. La key continua llegint-se de `.env` o `pass.env`.

Important: el `.exe` no empaqueta `pass.env` ni cap API key. En la versio instal·lada, posa la key en un fitxer `pass.env` dins la carpeta de dades de l'app:

```text
%APPDATA%\MNLSavior\pass.env
```

Si ja venies de la versio `Configurador Huurre`, MNLSavior tambe mira la carpeta antiga per no perdre la configuracio existent.

Provar un calcul per terminal:

```bash
cmd /c npm run catalog:quote
```

Generar i comptar totes les combinacions que aniran a Holded com articles simples:

```bash
cmd /c npm run catalog:combinations
node src/catalogCli.js combinations:list productCode=HI-CT coreCode=PIR thicknessMm=60 sheetCode=56 coatingCode=POL-2C
```

La combinacio final exclou extres operatius i segueix:

```text
panell + nucli + gruix + chapa + recobriment
```

El model recomanat es:

```text
Holded: productes base
Eina externa: chapa, recobriments, extres i calcul de preu
Pressupost Holded: linies ja calculades amb descripcio completa
```

La pantalla te un `Mode desenvolupador` que mostra el JSON de request/response. En mode normal queda amagat.

Els elements del cataleg es poden eliminar des de l'editor i despres guardar amb `Guardar tarifa`.

Vistes de la web:

- `Cataleg`: visualitzacio de preus base i configurador de linia.
- `Edicio`: canvi controlat de preus i eliminacio d'elements del cataleg.
- `Sincronitzacio Holded`: preview de la nova versio i diff contra els productes actuals de Holded. Aquesta vista nomes compara; no escriu canvis.

## 5. Actualitzar preus per SKU

Els preus es poden mantenir en un CSV amb aquest format:

```csv
sku,cost,price
TEST-HUR-COB-040-PIR-P-55-BP,22.5,31.4
```

Primer fes preview:

```bash
node src/updatePrices.js --dry-run data/prices.future-example.csv
```

Quan el preview sigui correcte, aplica-ho:

```bash
node src/updatePrices.js data/prices.future-example.csv
```

Tipus de document habituals de Holded:

- `invoice`
- `salesreceipt`
- `creditnote`
- `salesorder`
- `proform`
- `waybill`
- `estimate`
- `purchase`
- `purchaseorder`
- `purchaserefund`

## 6. Seguent pas recomanat

Decidir el primer flux real d'automatitzacio. Per exemple:

- Alta automatica de clients des d'un formulari o CRM.
- Creacio de factures des d'un CSV o ecommerce.
- Sincronitzacio de productes i stock.
- Llistat de factures pendents de cobrament.
- Enviament automatic de factures per email.

Quan tinguem clar el flux, podem afegir una carpeta `automations/` amb scripts especifics i validacions abans d'escriure a Holded.
