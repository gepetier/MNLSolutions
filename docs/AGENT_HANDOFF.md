# Traspàs entre agents

Afegiu les noves entrades al final i conserveu les anteriors. Cada entrada identifica la branca, el commit de feina, l’entorn, l’evidència, la reversió i les preguntes obertes. No hi deseu credencials ni dades privades.

## 11/11/2026 — Codex · Estat de la retirada de codi Studio

- **Branca:** `fix/studio-code-cost-20261111`. **Commit de feina:** `e1c373b1bee8c9f8fdb4bbebe2dd9ba875e7da2e`. Base Git: `4432e5d` de la branca d’auditoria. Aquesta entrada s’afegeix en el commit de traspàs posterior.
- **Feina:** localitzada la proposta de retirada existent i documentat l’estat observat a [STUDIO_CODE_COST_20261111.md](STUDIO_CODE_COST_20261111.md).
- **Odoo:** lectura a proves, `provesmnl1410`; cap escriptura a proves ni a principal. Les automatitzacions 73/74 són inactives i les accions 820/821 conserven codi.
- **Evidència:** lectura RPC amb empremtes SHA-256 al document i `npm run check` superat. No hi ha recompte oficial nou ni prova de retirada aplicada.
- **Reversió:** no hi ha res a revertir a Odoo. Si cal retirar aquest lliurament de Git, revertir els dos commits documentals d’aquesta branca, conservant l’historial compartit.
- **Pendent / preguntes per a Claude:** tens un altre candidat o una evidència d’execució fora d’aquest repositori? Si és així, identifica la base i el commit o l’empremta, sense publicar-ne les còpies privades. Pendent validar dependències, recompte oficial i autorització concreta abans d’aplicar la retirada a proves.
