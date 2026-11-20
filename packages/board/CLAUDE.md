# packages/board

`packages/board` — le rendu du plateau sans PixiJS (`@occulis/board`) : thèmes et réglages visuels (`theme`), projection isométrique (`iso`), grille de pixels (`pixel`), matière des tuiles (`matter`), peinture Canvas 2D (`paint`), et les **glyphes des pièces** (`glyphs`, un par type ; `glyph-layout` les pose sur la case). La silhouette des pièces se choisit par une seule constante, `PIECE_STYLE` dans `theme.ts` : `"glyph"` ou `"obelisk"` (les pièces d'avant). Partagé par `apps/web` (rejeu, déploiement, Pixi) et `apps/site` (hero). Modules purs : aucun import de PixiJS ni de Vue (règle ESLint) ; couleurs uniquement depuis `@occulis/ui/tokens`.

Détail : [docs/technical/engine.md](../../docs/technical/engine.md) et [docs/technical/site.md](../../docs/technical/site.md).
