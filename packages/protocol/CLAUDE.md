# packages/protocol

`packages/protocol` — les messages échangés entre le client et le serveur, et rien d'autre : aucune règle de jeu (elle vit dans `core`), aucun transport (il vit dans chaque app). Paquet partagé et non module de `apps/server`, précisément pour que les deux côtés ne puissent pas diverger.

Décrit dans [docs/technical/server.md](../../docs/technical/server.md).
