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
| [core.md](core.md) | Les règles du jeu : plateau, hauteur, ligne de vue, déplacement, capture, fog of war, types de pièces | `packages/core` |
| [engine.md](engine.md) | Le moteur de rendu et le client : écrans de compte et de menu, entrée en partie, projection isométrique, caméra, sélection et déplacement animé, couches, code couleur, saisie de coups | `apps/web` |
| [server.md](server.md) | Le serveur : Worker, Durable Objects de partie et de file (appariement et salons privés), base D1, protocole réseau | `apps/server`, `packages/protocol` |
| [infra.md](infra.md) | L'outillage et la CI/CD : environnements, migrations, déploiement | `tooling/infra`, `.github` |

## Carte du système

```
                    packages/core  ── logique de jeu pure, aucune dépendance de rendu
                    │                 y compris les types de pièces (pieces/)
                    packages/protocol ── messages du fil, aucune règle, aucun transport
                    ┌──────┴──────┐
                    │             │
              apps/web       apps/server
        rendu + écrans        Worker + DO de partie + DO de file et de salons
        + parties en ligne       │
                                 ├── D1 (log d'actions = source de vérité)
                                 └── sert apps/web/dist via le binding ASSETS

   tooling/infra ── TUI qui pilote wrangler, wrangler.toml et le manifeste de déploiement
   .github/workflows/ci.yml ── vérifications sur toute branche, déploiement sur les branches listées
```

Les deux consommateurs de `packages/core` en importent **le même code source** (`main` du
paquet pointe sur `./src/index.ts`, pas sur un build). Client et serveur déployés ensemble
partagent donc rigoureusement les mêmes règles, puisqu'ils viennent du même commit. C'est
la raison pour laquelle le roster provisoire lui-même vit dans `core` et non dans chaque
application : le comportement d'une pièce est de la logique de jeu, et le dupliquer serait
le laisser diverger.

## L'état réel du câblage

**Le client et le serveur se parlent, et le serveur arbitre.**

- **Il n'existe aucune partie locale.** `apps/web` ne joue rien tout seul : à l'arrivée
  sur la page, le canevas est masqué et c'est l'écran de compte qui s'affiche
  (`apps/web/src/ui/flow.ts`). La partie commence quand le Durable Object assied le joueur,
  et `OnlineMatch` (`apps/web/src/game/online-match.ts`) ne détient qu'une **hypothèse**
  reconstruite depuis les vues reçues — jamais la position.
- **Trois façons d'entrer en partie**, toutes par le même canal de file
  (`apps/web/src/net/queue-channel.ts` → `apps/server/src/queue-do.ts`) : appariement
  rapide, ouverture d'un salon privé avec un code, entrée par code.
- **Le log d'actions en D1 est la source de vérité** ; l'état du Durable Object est un
  cache reconstructible par rejeu.

Le fog est donc structurel : un client ne peut pas recevoir ce que le serveur ne lui envoie
pas.

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
