# Continuar en una altra màquina

## Arrencada local

Instal·la Node.js 24 amb npm, Git i, per les eines Excel i les previsualitzacions, Python 3.12 o superior. Executa les ordres des de l'arrel del clone.

```powershell
git clone https://github.com/gepetier/MNLSolutions.git
cd MNLSolutions
npm ci
npm run check
npm run catalog:combinations
npm run catalog:quote
npm run dev
```

Obre http://localhost:4173. El catàleg i els càlculs locals funcionen sense Odoo. `npm ci` reconstrueix les dependències des de `package-lock.json`; no cal copiar `node_modules`. Per obrir l'aplicació d'escriptori: `npm run electron`. Per generar els executables Windows, des de Windows: `npm run electron:build`.

## Eines Python

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python scripts/extract_contacts_from_quotes.py --help
node scripts/inspectWorkbook.mjs "C:\ruta\document.xlsx"
```

Si PowerShell bloqueja l'activació, fes servir directament `.\.venv\Scripts\python.exe` i configura `$env:PYTHON = (Resolve-Path .\.venv\Scripts\python.exe).Path` per al wrapper d'inspecció. Les ordres `npm run contacts:quotes` i `contacts:invoices` fan servir `python` del PATH.

A macOS/Linux: `python3 -m venv .venv`, `source .venv/bin/activate` i `python -m pip install -r requirements.txt`. L'eina `inspectExcelCom.ps1` requereix Windows i Microsoft Excel; `inspectWorkbook.mjs` és l'alternativa portable amb openpyxl/xlrd.

## Accés Odoo i dades privades

```powershell
Copy-Item .env.example 112.env
# Edita 112.env amb les credencials de la còpia de proves vigent.
$env:ODOO_ENV_FILE = '112.env'
$env:MNL_SENSITIVE_DATA_DIR = 'C:\ruta\privada\MNLSolutions-private-data'
New-Item -ItemType Directory -Force $env:MNL_SENSITIVE_DATA_DIR
npm run odoo:ping
npm run odoo:preview
```

Per carregar contactes o productes extrets, copia `contacts.json` i `quote-products.json` a aquesta carpeta privada. Els scripts Python també accepten `MNL_SENSITIVE_DATA_DIR` de l'entorn o `--output`; no llegeixen automàticament els fitxers `.env`. Les claus API s'han de recuperar o crear a Odoo i transferir per un canal privat. Un clone no conté credencials ni documents de clients.

Consulta `ENVIRONMENTS.md` abans d'escriure a Odoo. Les bases de proves caduquen: els noms documentats són l'últim estat conegut, no una comprovació d'accés actual.

## Què cobreix el repositori

- `src/`, `public/`, `electron/`: aplicació, motor de catàleg i integració Odoo.
- `data/catalog.json`, exemples i tarifa: fonts locals versionades.
- `scripts/`: instal·ladors, migracions, auditories i eines d'extracció.
- `docs/` i `TODO.md`: decisions, estat i feina pendent.
- `package-lock.json` i `requirements.txt`: dependències reproduïbles.

`logs/`, `outputs/`, `tmp/`, credencials i dades de clients són privats i no formen part del clone. Els backups de rollback històrics citats als documents romanen a l'equip original; si es necessiten, copia'ls per un canal privat. El clone tampoc és un backup de la base Odoo: les personalitzacions Studio i els registres viuen al servidor. Audita la còpia de proves abans de tornar a executar instal·ladors.

## Punt de represa

Llegeix `DEVELOPMENT_HANDOFF_2026-10-14.md`, els mestres `01` i `02`, `TODO.md` i els registres de setembre. El document `02` preval sobre `01` quan concreta o corregeix una decisió.

## Context compartit entre equips

`AGENTS.md` a l’arrel indica la lectura inicial de Codex. `docs/CONTEXT_INDEX.md` agrupa totes les fonts i explica quins recursos privats s’han de recuperar. Les eines històriques abans ignorades a tmp són ara a `scripts/archive/2026-09-23/`; els plans intermedis no substitueixen les decisions finals de setembre.
