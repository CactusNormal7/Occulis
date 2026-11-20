# Occulis — instructions pour les agents Codex / ChatGPT

Ce fichier est la source normative unique des instructions d'agent, lue par
Claude Code, Codex et Cursor. Les décisions métier et les explications
complètes restent dans les documents canoniques liés ci-dessous ; ne pas les
remplacer par des suppositions.

## Avant de modifier

- Lire `docs/design/rules.md` (sommaire : `docs/design.md`) avant toute décision de
  gameplay. `docs/design/open-points.md` recense les points ouverts : les soumettre
  au porteur du projet, ne pas les trancher implicitement. Avant de reproposer une
  idée de règle, lire `docs/design/history.md`. Lire aussi `docs/implementation-notes.md` lorsqu'une règle
  repose sur une interprétation déjà encodée.
- Lire `docs/architecture.md` avant de toucher à l'infrastructure, et le document
  pertinent de `docs/technical/` (`core.md`, `engine.md`, `server.md`, `ui.md`
  ou `infra.md`) avant de modifier son domaine.
- Si `graphify-out/graph.json` existe, utiliser d'abord `graphify query`,
  `graphify explain` ou `graphify path` pour les questions de code. Ne jamais
  versionner `graphify-out/`. Après une modification de code, lancer
  `graphify update .` si `graphify` est disponible.

## Architecture et invariants

- Monorepo pnpm en TypeScript strict. `packages/core` contient les règles pures ;
  `packages/protocol` uniquement les messages partagés ; le transport vit dans
  les applications. Le rendu Pixi/DOM ne va jamais dans `core`.
- `packages/core` est strictement déterministe : aucun `Math.random`, `Date.now`,
  horloge ni entropie. Un éventuel aléa passe par un seed explicite.
- Le serveur Cloudflare est autoritaire : il applique le fog à la source et ne
  transmet jamais au client des données hors de sa ligne de vue. Ne pas déplacer
  cette protection vers le rendu client.
- Les Durable Objects doivent pouvoir hiberner. Le log d'actions D1 est la source
  de vérité ; l'état d'un DO est reconstructible.
- Les tables Better Auth sont générées par
  `pnpm --filter @occulis/server auth:schema` et ne se modifient pas à la main.

## Conventions de produit et de code

- Le code est écrit pour être relu par des personnes : la lisibilité et la
  qualité priment sur la concision et l'astuce. Des noms explicites, des
  composants et fonctions courts qui font une seule chose, un flux de données
  visible, pas de raccourci obscur. Entre une version courte et une version
  claire, choisir la claire.
- Identifiants, routes, paramètres et clés sont en anglais. Les commentaires et
  la documentation restent en français.
- Tout texte affiché passe par `@occulis/i18n`, en anglais et en français. Les
  messages paramétrés sont des fonctions, pas des chaînes interpolées.
- `packages/ui/src/tokens.ts` est l'unique source des couleurs du produit.
  `src/generated/tokens.css` est généré et ne se modifie pas à la main.
- Une page se révèle d'un seul tenant : pas de chargement en cascade ni de
  `fetch` dans `onMounted` d'une vue Vue. Suivre les ressources de route,
  `await useLoad()` et la frontière `<Suspense>` documentés dans
  `docs/technical/engine.md`.
- Ne pas modifier une règle de gameplay sans décision correspondante dans
  `docs/design/rules.md`. Les commentaires expliquent le pourquoi, pas le quoi.

## Validation et documentation

Exécuter les vérifications proportionnées au changement :

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm format:check
```

Mettre à jour dans le même changement le document concerné de `docs/technical/`
quand une fonction, un emplacement, un comportement ou un invariant change. Le
pourquoi d'une décision reste dans `docs/design/rules.md` ou `docs/architecture.md`.

## Check-list de livraison

Les étapes obligatoires de toute tâche, regroupées sous un nom pour pouvoir dire
« fais la check-list de livraison ». Chaque ligne renvoie à la règle qui la fonde,
sans la recopier.

1. **Branche** dédiée, créée avant la première modification et nommée d'après la
   fonctionnalité (règles dans `CLAUDE.md`, section « Branches »).
2. **Tâche Nota** créée ou rattachée à sa tâche parente, Statut, Type, Domaine et
   Priorité renseignés, passée en « Fait » à la fin (`CLAUDE.md`, « Tâches Nota »).
3. **Décision consignée** : toute décision de gameplay ou de direction artistique
   dans `docs/design/rules.md` ; un point qui se ferme dans `open-points.md`, une
   idée écartée dans `history.md` (« Avant de modifier », plus haut).
4. **Documentation technique** du domaine à jour (`docs/technical/`, `CLAUDE.md`
   du paquet), et `docs/STATE.md` si l'état du projet change (« Validation et
   documentation », plus haut).
5. **Textes** affichés en anglais et en français par `@occulis/i18n`.
6. **Tests** du comportement ajouté ou modifié.
7. **Vérifications** vertes : `pnpm typecheck`, `pnpm lint`, `pnpm test`,
   `pnpm format:check`.
8. **Carte du code** : `graphify update .` si l'outil est disponible.
9. **Commits** en anglais, avec les lignes d'attribution demandées.

`CLAUDE.md` est conservé pour Claude Code et comme historique détaillé de ces
conventions. Les intégrations Claude Design sous `.design-sync/` concernent le
produit et ne doivent pas être supprimées en configurant Codex.
