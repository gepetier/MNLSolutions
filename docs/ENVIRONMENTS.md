# Entorns Odoo MNL

**Actualització documental:** 14 d’octubre de 2026
**Últim desplegament Odoo documentat:** 23 de setembre de 2026
**Odoo auditat:** Online Enterprise `saas~19.3`

## Entorns oficials

| Rol | Base de dades | Fitxer local de configuració | Política |
| --- | --- | --- | --- |
| Proves | `provesmnl202609` | `112.env` | Còpia neutralitzada vigent per a desenvolupament, migracions, regressió i validació visual. |
| Principal | `mnl-technical-consultant` | `BDprincipal.env` | No s'hi escriu fins que el mateix canvi estigui aprovat a proves i tingui preview, evidència i rollback. |

Els fitxers `*.env` són locals, contenen secrets i estan ignorats per Git. `.env.example` és l'únic fitxer de configuració que es pot versionar.

## Selecció explícita de l'entorn

PowerShell, proves:

```powershell
$env:ODOO_ENV_FILE = "112.env"
node src/cli.js ping
```

PowerShell, principal:

```powershell
$env:ODOO_ENV_FILE = "BDprincipal.env"
node src/cli.js ping
```

No s'ha de confiar en un `.env` implícit per executar ordres d'escriptura. Abans d'una ordre, s'ha de comprovar el nom de la base retornat pel `ping` o pel preview.

## Protocol de canvis

1. Definir el canvi i els criteris d'acceptació.
2. Executar auditoria o preview de lectura.
3. Aplicar-lo només a la còpia neutralitzada vigent (`provesmnl202609` a 16/09/2026).
4. Fer regressió funcional i, si afecta documents, revisar el PDF visualment.
5. Guardar evidència local sense credencials ni dades personals.
6. Preparar rollback.
7. Demanar aprovació explícita abans d'escriure a `mnl-technical-consultant`.
8. Repetir la comprovació després de migrar.

## Dades sensibles

Les dades de clients no poden viure dins del repositori. La ubicació compartida històrica és `Z:\Adri\Dades MNLSolutions`; en equips sense aquesta unitat cal configurar `MNL_SENSITIVE_DATA_DIR` amb una carpeta privada externa.

A 29 de juliol de 2026, el fitxer local de contactes s'ha retirat del projecte i s'ha guardat a:

`C:\Users\34605\Documents\MNLSolutions-private-data\contacts.json`

No s'ha de versionar aquesta ruta ni el seu contingut.

El 23 de setembre de 2026 es van carregar i verificar 342 contactes vàlids d'aquest fitxer a les bases de proves vigent i principal. Els 3 registres restants eren errors d'extracció i no es van importar. Detall a `docs/CONTACTS_IMPORT_2026-09-23.md`.
