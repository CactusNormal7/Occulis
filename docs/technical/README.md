# Documentation technique

Explication de bout en bout du fonctionnement réel du code : quelle fonction fait quoi,
où elle se trouve, et comment les morceaux s'appellent entre eux.

## Périmètre — et ce que ces documents ne sont pas

Ces fichiers décrivent **le code tel qu'il est**. Ils ne portent ni décision ni
justification : celles-ci vivent ailleurs et ne doivent pas être dupliquées ici.

| Question | Document |
|---|---|
| Comment ça marche, quelle fonction, où ? | **ici, `docs/technical/`** |
| Pourquoi cette règle de jeu ? | [docs/design.md](../design.md) |
| Pourquoi cette infrastructure ? | [docs/architecture.md](../architecture.md) |
| Qu'a-t-il fallu interpréter faute de décision ? | [docs/implementation-notes.md](../implementation-notes.md) |
| Comment installer et déployer ? | [docs/setup.md](../setup.md) |
| Combien ça coûte ? | [docs/costs.md](../costs.md) |

## Les quatre documents

| Fichier | Couvre | Paquet |
|---|---|---|
| [core.md](core.md) | Les règles du jeu : plateau, hauteur, ligne de vue, déplacement, capture, fog of war | `packages/core` |
| [engine.md](engine.md) | Le moteur de rendu : projection isométrique, caméra, désignation à la souris, couches, code couleur | `apps/web` |
| [server.md](server.md) | Le serveur : Worker, Durable Object de partie, base D1, protocole réseau | `apps/server` |
| [infra.md](infra.md) | L'outillage et la CI/CD : environnements, migrations, déploiement | `tooling/infra`, `.github` |

## Carte du système

```
                    packages/core  ── logique de jeu pure, aucune dépendance de rendu
                    ┌──────┴──────┐
                    │             │
              apps/web       apps/server
          moteur de rendu   Worker + Durable Object
                                  │
                                  ├── D1 (log d'actions = source de vérité)
                                  └── sert apps/web/dist via le binding ASSETS

   tooling/infra ── TUI qui pilote wrangler, wrangler.toml et le manifeste de déploiement
   .github/workflows/ci.yml ── vérifications sur toute branche, déploiement sur les branches listées
```

Les deux consommateurs de `packages/core` en importent **le même code source** (`main` du
paquet pointe sur `./src/index.ts`, pas sur un build). Client et serveur déployés ensemble
partagent donc rigoureusement les mêmes règles, puisqu'ils viennent du même commit.

## L'état réel du câblage

C'est le point le plus important à comprendre avant de lire le reste, et le plus facile à
se tromper : **le client et le serveur ne se parlent pas encore.**

- `apps/web` ne contient **aucun appel réseau** — ni `fetch`, ni `WebSocket`. Son point
  d'entrée `main()` (`apps/web/src/main.ts`) construit une partie locale avec
  `demoGame()` (`apps/web/src/scenario.ts`) et l'affiche. Il n'envoie jamais d'action :
  aucune interaction de jeu n'est branchée, seule la caméra répond.
- `apps/server` est un squelette complet et cohérent (Worker, Durable Object, schéma D1,
  protocole), mais **rien ne l'appelle**. Le type `ClientMessage`
  (`apps/server/src/protocol.ts`) n'a pas d'émetteur.
- Il n'existe donc à ce jour **aucun chemin de bout en bout** entre une action jouée et
  un état persisté. Les deux moitiés sont écrites contre la même `packages/core` et
  s'emboîteront, mais la jonction reste à faire.

## Règle de maintenance

**Toute modification du code décrit ici met à jour le document correspondant dans le même
commit.** Une doc de référence fausse est pire que pas de doc : elle fait perdre du temps
en donnant l'illusion d'être fiable.

Concrètement, avant de considérer un changement comme terminé :

1. Une fonction ajoutée, renommée, supprimée ou déplacée → corriger son entrée dans le
   document du paquet concerné.
2. Un comportement modifié (une constante de réglage, une règle, un ordre d'appel) →
   corriger la description, pas seulement le nom.
3. Un invariant touché (voir la section « Invariants » de chaque document) → soit le
   rétablir, soit mettre à jour l'invariant *et* dire pourquoi il a changé.
4. Une décision de game design ou d'infra derrière le changement → elle va dans
   `docs/design.md` ou `docs/architecture.md`, pas ici.

Le tableau des fonctions de chaque document est vérifiable mécaniquement : un `grep` du
nom dans le chemin indiqué doit toujours donner un résultat.
