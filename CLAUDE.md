# Occulis — complément Claude Code

Les règles communes et normatives vivent dans [AGENTS.md](AGENTS.md). Claude Code doit les
lire avant toute modification ; ce fichier ne les remplace pas et ne les duplique pas.

## Intégrations propres à Claude Code

- Les synchronisations Claude Design sous `.design-sync/` appartiennent au produit. Ne pas
  les supprimer ni les remplacer en configurant Codex ou Cursor. La procédure associée est
  dans `.design-sync/NOTES.md`.
- Si `graphify-out/graph.json` existe, commencer une question de code par `graphify query`,
  `graphify explain` ou `graphify path`. La carte est locale, ignorée par Git et se régénère
  avec `graphify update .` après une modification de code lorsque l'outil est disponible.

## Branches

- Une branche se nomme d'après la fonctionnalité qu'elle porte (`feature/onboarding`,
  `fix/dialog-confirm`), jamais d'un nom aléatoire ou généré.
- Le nom d'une branche ne cite jamais « claude », sauf demande explicite.

## Références et historique

- Les décisions de gameplay sont dans [docs/design/rules.md](docs/design/rules.md) (sommaire :
  [docs/design.md](docs/design.md)), les questions ouvertes dans
  [docs/design/open-points.md](docs/design/open-points.md) et les idées écartées dans
  [docs/design/history.md](docs/design/history.md) ; les interprétations
  déjà encodées dans [docs/implementation-notes.md](docs/implementation-notes.md).
- L'architecture et l'infrastructure sont expliquées dans [docs/architecture.md](docs/architecture.md),
  puis dans [docs/technical/](docs/technical/README.md).
- Les audits datés sont archivés dans [docs/reports/](docs/reports/README.md) : ils décrivent
  un état passé et ne remplacent jamais la documentation de référence.
- L'état courant du projet est dans [docs/STATE.md](docs/STATE.md) ; ses anciens états sont
  archivés dans [docs/history/](docs/history/).
- Les invariants détaillés sont dans [docs/architecture.md](docs/architecture.md#invariants) ;
  les chemins de refonte graphique dans
  [docs/design/refonte-graphique.md](docs/design/refonte-graphique.md).
- Chaque dossier (`packages/core`, `apps/web`, `apps/server`, `packages/i18n`, `tooling/infra`)
  a son propre `CLAUDE.md`, chargé quand on y travaille.
