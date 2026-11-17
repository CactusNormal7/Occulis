# packages/board

`packages/board` — le rendu du plateau sans PixiJS (`@occulis/board`) : thèmes et réglages visuels (`theme`), projection isométrique (`iso`), grille de pixels (`pixel`), matière des tuiles (`matter`) et peinture Canvas 2D (`paint`). Partagé par `apps/web` (rejeu, déploiement, Pixi) et `apps/site` (hero). Modules purs : aucun import de PixiJS ni de React (règle ESLint) ; couleurs uniquement depuis `@occulis/ui/tokens`.

Détail : [docs/technical/engine.md](../../docs/technical/engine.md) et [docs/technical/site.md](../../docs/technical/site.md).
