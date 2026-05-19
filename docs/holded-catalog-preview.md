# Preview cataleg Holded - Panell Sandwich Huurre

## Situacio actual a Holded

Productes detectats actualment:

| Tipus | Nom | Notes |
| --- | --- | --- |
| Variants | prov | Producte de prova amb variants i SKUs `11`, `12`. |
| Variants | RE | Producte de prova amb variants sense SKU. |
| Simple | PANEL INDUSPANEL FP 600 COLOR MNL 12.65/2 - (3,800 x 0,600) | Producte real existent, sense SKU informat. |

Conclusio: Holded ja accepta productes amb variants. Per pressupostar rapid, conve normalitzar noms i SKUs abans de carregar el cataleg nou.

## Estructura recomanada

Producte principal a Holded:

```text
Panell Sandwich Huurre {Familia} {Gruix} mm
```

Variants del producte:

```text
Espuma + Xapa + Acabat
```

Exemple:

```text
Producte:
Panell Sandwich Huurre Coberta 40 mm

Variant:
PIR Premium / 5-5 / Blanc Pirineu

Nom visible en pressupost:
Panell Sandwich Huurre Coberta 40 mm PIR Premium 5-5 Blanc Pirineu
```

## Families inicials proposades

| Codi | Familia | Us |
| --- | --- | --- |
| COB | Coberta | Cobertes industrials, naus, magatzems. |
| FAC | Facana | Tancaments verticals i revestiments. |
| FRI | Frigorific | Cambres, refrigeracio i alimentaria. |
| SEC | Sectoritzacio | Resistencies al foc o divisories tecniques. |

Podem deixar nomes les families reals de venda i amagar la resta.

## Gruixos inicials proposats

| Codi | Gruix |
| --- | --- |
| 030 | 30 mm |
| 040 | 40 mm |
| 050 | 50 mm |
| 060 | 60 mm |
| 080 | 80 mm |
| 100 | 100 mm |
| 120 | 120 mm |

Cada combinacio `familia + gruix` seria un producte principal.

## Variant 1 - Qualitat espuma

| Codi | Espuma |
| --- | --- |
| PIR-S | PIR Standard |
| PIR-P | PIR Premium |
| LM-RF | Llana mineral / RF |

Noms provisionals fins que tinguem nomenclatura exacta de Huurre.

## Variant 2 - Gruix chapa

| Codi | Chapa | Predeterminat |
| --- | --- | --- |
| 55 | 5/5 | Si |
| 45 | 4/5 | No |
| 44 | 4/4 | No |
| 56 | 5/6 | No |
| 66 | 6/6 | No |

Interpretacio: `5/5` = chapa exterior 0,5 mm i interior 0,5 mm.

## Variant 3 - Acabat

| Codi | Acabat |
| --- | --- |
| BP | Blanc Pirineu |
| BG | Blanc Gris |
| GP | Gris Plata |
| GA | Gris Antracita |
| NE | Negre |
| VT | Vermell Teula |
| VN | Verd Navarra |
| IF | Imitacio Fusta |

Acabats provisionals. Idealment els substituirem pels RAL o acabats reals del proveidor.

## Format SKU

```text
HUR-{FAMILIA}-{GRUIX}-{ESPUMA}-{CHAPA}-{ACABAT}
```

Exemple:

```text
HUR-COB-040-PIR-P-55-BP
```

## Preview de productes principals

| Producte Holded | SKU base | Unitat | IVA | Tipus |
| --- | --- | --- | --- | --- |
| Panell Sandwich Huurre Coberta 30 mm | HUR-COB-030 | m2 | 21% | variants |
| Panell Sandwich Huurre Coberta 40 mm | HUR-COB-040 | m2 | 21% | variants |
| Panell Sandwich Huurre Coberta 50 mm | HUR-COB-050 | m2 | 21% | variants |
| Panell Sandwich Huurre Coberta 60 mm | HUR-COB-060 | m2 | 21% | variants |
| Panell Sandwich Huurre Coberta 80 mm | HUR-COB-080 | m2 | 21% | variants |
| Panell Sandwich Huurre Coberta 100 mm | HUR-COB-100 | m2 | 21% | variants |
| Panell Sandwich Huurre Coberta 120 mm | HUR-COB-120 | m2 | 21% | variants |
| Panell Sandwich Huurre Facana 40 mm | HUR-FAC-040 | m2 | 21% | variants |
| Panell Sandwich Huurre Facana 50 mm | HUR-FAC-050 | m2 | 21% | variants |
| Panell Sandwich Huurre Facana 60 mm | HUR-FAC-060 | m2 | 21% | variants |

## Preview de variants per producte

Exemple per `Panell Sandwich Huurre Coberta 40 mm`.

| SKU variant | Nom variant | Espuma | Chapa | Acabat |
| --- | --- | --- | --- | --- |
| HUR-COB-040-PIR-S-55-BP | PIR Standard / 5-5 / Blanc Pirineu | PIR Standard | 5/5 | Blanc Pirineu |
| HUR-COB-040-PIR-S-55-BG | PIR Standard / 5-5 / Blanc Gris | PIR Standard | 5/5 | Blanc Gris |
| HUR-COB-040-PIR-S-55-GP | PIR Standard / 5-5 / Gris Plata | PIR Standard | 5/5 | Gris Plata |
| HUR-COB-040-PIR-P-55-BP | PIR Premium / 5-5 / Blanc Pirineu | PIR Premium | 5/5 | Blanc Pirineu |
| HUR-COB-040-PIR-P-55-BG | PIR Premium / 5-5 / Blanc Gris | PIR Premium | 5/5 | Blanc Gris |
| HUR-COB-040-LM-RF-55-BP | Llana mineral / RF / 5-5 / Blanc Pirineu | Llana mineral / RF | 5/5 | Blanc Pirineu |
| HUR-COB-040-PIR-S-45-BP | PIR Standard / 4-5 / Blanc Pirineu | PIR Standard | 4/5 | Blanc Pirineu |
| HUR-COB-040-PIR-S-44-BP | PIR Standard / 4-4 / Blanc Pirineu | PIR Standard | 4/4 | Blanc Pirineu |
| HUR-COB-040-PIR-S-56-BP | PIR Standard / 5-6 / Blanc Pirineu | PIR Standard | 5/6 | Blanc Pirineu |
| HUR-COB-040-PIR-S-66-BP | PIR Standard / 6-6 / Blanc Pirineu | PIR Standard | 6/6 | Blanc Pirineu |

Cada producte principal tindria fins a:

```text
3 espumes x 5 chapes x 8 acabats = 120 variants
```

## Camps recomanats per Holded

| Camp Holded | Valor recomanat |
| --- | --- |
| `kind` | `variants` |
| `name` | `Panell Sandwich Huurre Coberta 40 mm` |
| `desc` | Descripcio tecnica curta del panell. |
| `sku` | SKU base opcional, per exemple `HUR-COB-040`. |
| `taxes` | `s_iva_21` |
| `forSale` | `1` |
| `forPurchase` | `1` |
| `hasStock` | `false` inicialment, excepte si voleu controlar stock. |
| `price` | Preu base o `0` si dependra de tarifa. |
| `cost` | Cost base o `0` si dependra de tarifa. |
| `variants[].sku` | SKU complet de variant. |
| `variants[].price` | Preu de venda per m2. |
| `variants[].cost` | Cost per m2. |

## Decisions pendents abans de carregar a Holded

| Decisio | Proposta inicial |
| --- | --- |
| Families reals | Comencar amb Coberta i Facana si son les principals. |
| Gruixos reals per familia | No carregar gruixos que no vengueu. |
| Noms exactes d'espuma | Substituir `PIR Standard`, `PIR Premium`, `Llana mineral / RF` pels noms comercials reals. |
| Acabats exactes | Substituir pels RAL/acabats reals de tarifa Huurre. |
| Preu | Carregar `0` primer o importar tarifa de compra/venda quan la tinguem. |
| Stock | Recomanat `false` si es compra sota comanda. |
