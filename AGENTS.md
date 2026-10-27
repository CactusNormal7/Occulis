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

- Identifiants, routes, paramètres et clés sont en anglais. Les commentaires et
  la documentation restent en français.
- Tout texte affiché passe par `@occulis/i18n`, en anglais et en français. Les
  messages paramétrés sont des fonctions, pas des chaînes interpolées.
- `packages/ui/src/tokens.ts` est l'unique source des couleurs du produit.
  `src/generated/tokens.css` est généré et ne se modifie pas à la main.
- Une page se révèle d'un seul tenant : pas de chargement en cascade ni de
  `useEffect` + `fetch` dans une vue React. Suivre les ressources de route,
  `useLoad` et la frontière `Suspense` documentés dans `docs/technical/engine.md`.
- Ne pas modifier une règle de gameplay sans décision correspondante dans
  `docs/design.md`. Les commentaires expliquent le pourquoi, pas le quoi.

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
pourquoi d'une décision reste dans `docs/design.md` ou `docs/architecture.md`.

`CLAUDE.md` est conservé pour Claude Code et comme historique détaillé de ces
conventions. Les intégrations Claude Design sous `.design-sync/` concernent le
produit et ne doivent pas être supprimées en configurant Codex.
