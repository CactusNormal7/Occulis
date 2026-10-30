# Arrivée sur Occulis

Ce guide permet de passer d'un clone vide à une partie locale. Il ne demande aucun accès
Cloudflare et complète [setup.md](setup.md), réservé à l'infrastructure et aux
environnements hébergés.

## 1. Outils et installation

Installer Node 24 : `.nvmrc` est la référence (la CI lit la même version) et wrangler ne
démarre pas avec Node 22. Avec un gestionnaire compatible nvm :

```bash
nvm install
nvm use
corepack enable
pnpm install
```

Vérifier ensuite `node --version` et `pnpm --version` : le dépôt attend Node 24 et pnpm 10.
Un terminal resté sous Node 20 ou 22 est la première cause d'échec de démarrage.

Créer la configuration locale, sans jamais la committer :

```bash
cp apps/server/.dev.vars.example apps/server/.dev.vars
pnpm local
```

Sous PowerShell, remplacer `cp` par :

```powershell
Copy-Item apps/server/.dev.vars.example apps/server/.dev.vars
```

`pnpm local` construit le client, applique les migrations dans D1 locale et démarre le
Worker avec Durable Objects sur `http://localhost:8787`.

## 2. Vérifier le parcours local

1. Ouvrir `http://localhost:8787` dans deux profils de navigateur distincts.
2. Créer deux comptes. Les courriels locaux sont écrits dans le terminal de `wrangler dev`;
   ouvrir leur lien de vérification pour chacun des comptes avant d'entrer dans la file.
3. Lancer une partie rapide ou créer puis rejoindre un salon privé, accepter la proposition
   si nécessaire, préparer les deux équipes et jouer un coup.
4. Pour tester le back-office, créer le compte puis, dans un second terminal à la racine :

   ```bash
   cd apps/server
   pnpm exec wrangler d1 execute DB --local --command \
     "UPDATE users SET role = 'admin' WHERE email = 'vous@exemple.fr'"
   ```

   Se reconnecter ensuite : une session ouverte conserve son rôle précédent.

### Lancer les tests

Les tests sont des tests Vitest, sans service distant ni compte Cloudflare. Il n'y a pas de
test E2E dans le navigateur à ce jour : le parcours ci-dessus en tient lieu.

```bash
pnpm test                          # tous les paquets
pnpm --filter @occulis/core test   # un seul paquet (core, web, server, ui, i18n, protocol, infra)
```

- `packages/core`, `packages/protocol` et `apps/web` sont lancés avec la couverture
  (`vitest run --coverage`) ; les seuils font échouer la commande.
- `apps/server` exécute ses tests d'intégration dans workerd (Durable Objects et D1 en
  mémoire) et exigent Node 24, comme le reste du dépôt.
- Avant une PR, la suite complète est `pnpm typecheck && pnpm lint && pnpm test &&
pnpm format:check && pnpm build` (voir [../CONTRIBUTING.md](../CONTRIBUTING.md)).
- Une modification de `packages/core` se teste d'abord dans son paquet : le moteur est
  déterministe, un test qui échoue se rejoue à l'identique.

## 3. Dépannage local

- **Node ou pnpm introuvable** : rouvrir le terminal après l'installation et exécuter
  `nvm use`, puis `corepack enable`.
- **Inscription ou connexion échoue seulement sur un environnement hébergé** : la bordure
  Cloudflare impose une limite PBKDF2 différente de workerd local. Ne pas modifier le coût
  du hachage sans suivre [technical/server.md](technical/server.md).
- **État D1 local incohérent** : arrêter `pnpm local`, supprimer uniquement
  `apps/server/.wrangler/state`, puis relancer `pnpm local`. Cela efface les comptes et les
  parties locaux, jamais les environnements distants.
- **Aucun lien de vérification reçu** : vérifier la console de `wrangler dev`; en local,
  `MAIL_TO_CONSOLE` journalise les messages au lieu de les envoyer.

## 4. Carte de la documentation

| Besoin                                | Référence                                          |
| ------------------------------------- | -------------------------------------------------- |
| Règles validées et décisions ouvertes | [design.md](design.md)                             |
| Pourquoi l'infrastructure existe      | [architecture.md](architecture.md)                 |
| Interprétations déjà codées           | [implementation-notes.md](implementation-notes.md) |
| Fonctionnement par domaine            | [technical/](technical/README.md)                  |
| Cloudflare, secrets et déploiements   | [setup.md](setup.md)                               |
| Contribution et revue                 | [../CONTRIBUTING.md](../CONTRIBUTING.md)           |
| Audits historiques                    | [reports/](reports/README.md)                      |

`design.md` et `architecture.md` portent le **pourquoi**. `technical/` décrit le
**comment** réel du code. Les rapports datés sont des instantanés historiques, pas des
instructions à appliquer sans vérification.

## 5. Accès à demander

| Accès         | Quand le demander                                                       |
| ------------- | ----------------------------------------------------------------------- |
| GitHub        | Toujours : dépôt, issues et pull requests.                              |
| Nota          | Toujours : tâches, décisions et suivi (base « Tâches », Tengram Ydays). |
| Claude Design | Seulement pour une contribution à la charte ou aux aperçus.             |
| Cloudflare    | Seulement pour une tâche d'infrastructure ou un preview distant validé. |

Le développement local suffit à une première contribution. Un preview Cloudflare complet est
une exception explicitement créée via `pnpm infra`, jamais une étape d'arrivée.
