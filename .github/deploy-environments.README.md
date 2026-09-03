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

`pnpm infra` → **Créer un environnement de branche** fait les trois d'un coup depuis la
branche courante, applique les migrations, puis committe et pousse ce fichier et
`apps/server/wrangler.toml`. **Supprimer un environnement de branche** les défait (Worker et
base distante compris) pour **n'importe quelle cible, depuis n'importe quelle branche** — le
retrait est committé sur la branche courante, et chaque autre branche garde sa propre copie
de ce fichier. Édition manuelle possible, mais garder les trois cohérents.
