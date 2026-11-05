# Consolidació de helpers — prototip pendent d’Odoo

S’han implementat `scripts/prepare_shared_helpers.py` i `scripts/test_shared_helpers.py`. Treballen sobre inventaris privats fora de Git. El primer prepara fonts originals, candidates i un registre compartit; el segon compara casos funcionals simulats. No contacten ni escriuen a Odoo.

La prova local amb l’inventari privat de referència ha superat 18 casos: dimensions, descomptes, increment percentual sobre base, transport, classificadors i validesa. La sintaxi Python i la de l’eina Node de preparació de retirada també passen. No equival a validació ORM, safe_eval, permisos, PDFs o rendiment.

El registre és codi facturable i ha d’entrar en qualsevol projecció. Cal provar primer que la versió Enterprise instal·lada admet el retorn de funcions entre accions, preservar pseudoregistres/context i comprovar latència. No desplegar a principal sense assaig complet, Count LoC oficial i aprovació.

Les dades, projeccions econòmiques i fonts extretes es conserven en privat. El control del navegador estava indisponible durant aquesta implementació; no s’ha instal·lat cap canvi en cap base.
