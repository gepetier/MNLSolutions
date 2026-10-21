# Etiqueta de transport — 20/10/2026

Per instrucció de l’usuari, substituir «Portes» per «Transport» en català al pressupost. Aplicat només a `provesmnl1410`.

El mateix producte intern MNL-PORTES es conserva, amb el nom traduït Transport (CA/EN) i Transporte (ES). Les plantilles estàndard i v3 prenen el nom del producte i reflecteixen el canvi sense substituir-lo per text fix. La vista de pressupost mostra Transport, Configuració de transport, Aplicar / actualitzar transport i Treure transport, inclosa la confirmació d’eliminació.

No es canvien noms tècnics de camps, SKU, identificadors, fórmules de costos, tarifes ni imports. La descripció interna que genera l’acció històrica pot conservar «Portes»; no s’utilitza com a nom d’article en els documents aprovats.

Reproducció: `scripts/install_odoo_transport_labels.js` mostra preview; `--apply` aplica amb backup privat. `--rollback RUTA_BACKUP` restaura els noms per idioma i la vista (o desactiva la vista creada). No executar l’instal·lador complet de transport per fer aquest canvi d’etiqueta.

Validació: vista combinada amb l’etiqueta nova, PDF v3 regenerat des d’Odoo amb Transport, nou columnes i imports coincidents amb la fotografia del pressupost. Total conservat: 6.244,83 €. V3 continua sent prova, v2 predeterminada. Principal sense canvis.
