# Traspàs entre agents

## 11/11/2026 · Recuperació de l’evidència privada de la retirada de codi Studio

- Branca `fix/studio-code-cost-20261105`. La retirada a `mnl-technical-consultant` consta al [registre del 05/11/2026](STUDIO_CODE_COST_20261105.md). Claude ha confirmat en lectura el 11/11/2026 que les 26 accions contenen `# Retirat 2026-11-05` i els 9 camps tenen la fórmula buida, segons la verificació comunicada per l’usuari.
- Destinació prevista `C:\Users\34605\Documents\MNLSolutions-private-data\studio-code-cost-20261105\`. La cerca local i a la carpeta compartida del projecte no ha trobat cap dels tres fitxers. El xat de la retirada del 05/11 enllaça el ZIP i el Markdown a la biblioteca privada de ChatGPT. L’accés des d’aquesta sessió s’ha aturat perquè el control del navegador no ha pogut verificar l’URL. L’origen del JSON queda pendent de localitzar.

| Fitxer | SHA-256 esperat segons el registre del 05/11 | SHA-256 de la còpia |
| --- | --- | --- |
| `Reversio_codi_principal_MNL_20261105.zip` | `0731f426a7fe9f4c4ffc5ae6a3b3391515a5704225499c4de9306d99b50abbae` | Pendent de descàrrega i còpia |
| `Retirada_codi_principal_MNL_20261105.md` | `614fc6f71d45c3fe8c11a98a65356ba76e4b27cc7a0974536c989953ddba3ca5` | Pendent de descàrrega i còpia |
| `Odoo_MNL_historial_cost_codi.json` | `90be3cad7c68d1ff1562f4a972efa0add5b7ea49de569179a27e78f7f6b78e9d` | Fitxer pendent de localitzar |

Inventari del ZIP pendent. Quan es recuperi, cal anotar els noms i les mides de les entrades i confirmar que conté els cossos originals de les accions 808–834 (exclosa la 827) i les fórmules dels camps 21246, 21248, 21373, 21375, 21377, 21380, 21382, 21385 i 21387. La recuperació no ha comportat cap accés a Odoo.

## 11/11/2026 · Claude · Evidència privada recuperada i verificada

- **Branca:** `fix/studio-code-cost-20261105`, sobre `133b61f`. Només aquesta nota; cap fitxer privat a Git i cap accés a Odoo en aquest lliurament.
- **Origen:** l'usuari va descarregar el ZIP i el Markdown de la biblioteca de ChatGPT a `C:\Users\34605\Downloads\` (11/11/2026, 19:20). Copiats, sense moure'ls, a `C:\Users\34605\Documents\MNLSolutions-private-data\studio-code-cost-20261105\`.

| Fitxer | Mida | SHA-256 calculat (`Get-FileHash`) | Resultat |
| --- | ---: | --- | --- |
| `Reversio_codi_principal_MNL_20261105.zip` | 45.713 B | `0731f426a7fe9f4c4ffc5ae6a3b3391515a5704225499c4de9306d99b50abbae` | Coincideix |
| `Retirada_codi_principal_MNL_20261105.md` | 14.232 B | `614fc6f71d45c3fe8c11a98a65356ba76e4b27cc7a0974536c989953ddba3ca5` | Coincideix |
| `Odoo_MNL_historial_cost_codi.json` | — | — | **No trobat** a l'equip (`C:\Users\34605`) ni a `Z:\` (fins a 4 nivells) |

**Inventari del ZIP (lectura):** 45 entrades.

| Entrada | Mida (B) |
| --- | ---: |
| `README_reversio.md` | 1.551 |
| `Retirada_codi_principal_MNL_20261105.md` | 14.232 |
| `accions_originals.csv` | 35.829 |
| `accions_rollback.csv` | 32.801 |
| `camps_originals.json` | 6.298 |
| `camps_copia_en_viu.json` | 4.311 |
| `automatitzacions_referencia_no_modificades.json` | 6.168 |
| `canvis_aplicats.json` | 2.479 |
| `Count_LoC_final_20261105.txt` | 1.728 |
| `manifest.json` | 14.397 |
| `fonts_originals/ir.actions.server-<ID>.py` × 26 | 251–3.670 |
| `fonts_originals/ir.model.fields-<ID>.py` × 9 | 123–575 |

- **Cobertura:** fonts de les 26 accions 808–834 (sense 827) i dels 9 camps 21246, 21248, 21373, 21375, 21377, 21380, 21382, 21385 i 21387. Cap font és buida ni conté el marcador `# Retirat 2026-11-05`.
- **Manifest:** `database = mnl-technical-consultant`, línies oficials 729 → 0, 26 accions i 9 camps. Els 44 SHA-256 interns de `files_sha256` coincideixen amb les entrades del ZIP.
- **Lectura Odoo prèvia (Claude, 11/11/2026, API search_read):** principal té les 26 accions amb el marcador i els 9 camps sense `compute`; `provesmnl1410` conserva tot el codi original; automatitzacions 73/74 inactives a les dues bases.
- **Pendent / per a Codex:** localitzar `Odoo_MNL_historial_cost_codi.json` (probablement també a la biblioteca de ChatGPT). No és necessari per revertir: el ZIP conté les fonts i el manifest complets. La branca `fix/studio-code-cost-20261111` està superada per aquesta; no hi continueu.
