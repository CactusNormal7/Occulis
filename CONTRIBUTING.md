# Contribuer à Occulis

Ce guide organise le travail d'équipe. Les règles techniques normatives sont dans
[AGENTS.md](AGENTS.md) ; le parcours de première installation est dans
[docs/onboarding.md](docs/onboarding.md).

## Préparer une contribution

1. Partir de `staging` à jour et créer une branche anglaise en kebab-case :
   `feature/<sujet>`, `fix/<sujet>`, `docs/<sujet>`, `chore/<sujet>` ou
   `codex/<sujet>`.
2. Ne jamais pousser directement sur `staging` ni `main`.
3. Écrire les commits et la description de PR en anglais. Le code, les identifiants,
   les routes et les clés sont en anglais ; les commentaires et la documentation du dépôt
   restent en français.
4. Lire le document de référence du domaine avant de le modifier : design et notes
   d'implémentation pour le gameplay, architecture et documentation technique pour
   l'infrastructure et le code.

Une règle de gameplay ne s'invente pas : si elle n'est pas tranchée dans
`docs/design.md`, ouvrir ou relier la décision au lieu de l'implémenter.

## Avant d'ouvrir une PR

Exécuter les vérifications adaptées, et obligatoirement celles-ci pour une modification de code :

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm format:check
pnpm build
```

Mettre à jour dans le même commit la documentation technique concernée. Tout texte affiché
existe en anglais et en français via `@occulis/i18n`; aucune couleur ne va hors de
`packages/ui/src/tokens.ts`; `packages/core` reste déterministe.

## Pull requests et fusion

- Ouvrir la PR vers `staging`, avec le ticket Notion associé et le modèle rempli.
- Ajouter une capture ou un enregistrement lorsque l'interface change.
- Le porteur du projet, `@CactusNormal7`, relit les chemins critiques et est le seul à
  fusionner vers `staging` ou `main`.
- Une livraison vers `main` part d'une PR depuis `staging`, après validation en recette.

Les protections détaillées dans [.github/BRANCH_PROTECTION.md](.github/BRANCH_PROTECTION.md)
doivent rester actives dans GitHub.

## Environnements distants

Le développement local est la norme. Un environnement Cloudflare complet de branche est
exceptionnel : il est créé seulement lorsqu'une tâche justifie un test distant, via
`pnpm infra`, puis supprimé dès qu'il n'est plus utile. La sélection reste explicite dans
`.github/deploy-environments.json`; consulter [docs/setup.md](docs/setup.md) avant toute
opération Cloudflare.
