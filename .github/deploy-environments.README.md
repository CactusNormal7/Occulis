# Branches déployées

Ce fichier est la liste des branches qui possèdent un environnement hébergé. Une branche
absente d'ici passe la CI mais n'est **pas** déployée : la population d'environnements est
décidée, pas subie (docs/architecture.md section 4).

```json
{ "<branche>": { "wranglerEnv": "<env wrangler>", "d1Database": "<base D1>" } }
```

Ajouter une branche suppose trois choses cohérentes entre elles :

1. une entrée ici ;
2. un bloc `[env.<wranglerEnv>]` dans `apps/server/wrangler.toml`, avec ses bindings —
   ils ne sont pas hérités par les environnements nommés ;
3. la base D1 correspondante, créée et son `database_id` reporté dans le toml.

`pnpm infra` a vocation à faire les trois d'un coup (point ouvert 3 d'architecture.md :
le mécanisme est arrêté — c'est ce fichier plus l'outil — mais l'outil ne l'écrit pas encore).
