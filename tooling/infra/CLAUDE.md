# tooling/infra et CI/CD

Décidée et documentée dans [docs/architecture.md](../../docs/architecture.md) ; chiffrage dans
[docs/costs.md](../../docs/costs.md) ; procédure d'installation dans [docs/setup.md](../../docs/setup.md).
Le Worker (`apps/server`), le matchmaking, l'authentification et la CI/CD sont en place ; reste la distribution Electron.
Les points encore ouverts sont listés en section 7 d'architecture.md : demander avant de trancher,
comme pour la section 10 du design doc.

- **Quatre environnements** : local (`wrangler dev`, SQLite local), preview par branche (`occulis-<branche>.0kl.fr`), recette (`occulis-staging.0kl.fr`), prod (`occulis.0kl.fr`, sur `main`). **Une branche = un environnement complet** (client + Worker + DO + base), jamais un preview du client seul : une branche qui touche `core` change les règles et serait sinon testée contre celles de `main`.
- **Les branches hébergées sont sélectionnées explicitement**, pas déployées automatiquement : on doit pouvoir en ajouter et en retirer à volonté, pour que la population d'environnements soit décidée et non subie. Le mécanisme est le manifeste `.github/deploy-environments.json`, édité dans les deux sens par `pnpm infra` (« Créer / Supprimer un environnement de branche »). La création part de la branche courante ; la suppression vise une cible explicite et marche depuis n'importe quelle branche, un environnement devant rester défaisable après la fusion de sa branche.
- **CI/CD** : `.github/workflows/ci.yml`. Les vérifications (`typecheck → lint → test → build`) tournent sur toute branche et toute PR ; le déploiement ne concerne que les branches listées dans **`.github/deploy-environments.json`** (`main` → production, `staging` → recette). Une branche absente du manifeste passe la CI sans être déployée : c'est là le mécanisme de sélection des environnements. Les migrations D1 précèdent toujours le déploiement. Un workflow séparé, sur tag, buildera et signera les binaires Electron.
- **L'URL du serveur n'est pas encore un sujet dans le code** : aucune variable de ce type n'existe, et le client est servi par le Worker lui-même (binding `ASSETS`), donc de même origine — une URL relative suffira sur le web. La contrainte connue ne vaudra que pour la distribution Electron, où le client n'est plus de même origine : l'URL y sera injectée au build et donc **gravée dans le binaire distribué**, ce qui impose de la figer avant le premier build public.

L'hébergement (Worker, DO, D1) et les invariants sont dans [docs/architecture.md](../../docs/architecture.md). Détail : [docs/technical/infra.md](../../docs/technical/infra.md).
