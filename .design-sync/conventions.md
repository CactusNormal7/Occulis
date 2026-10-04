# Occulis UI — conventions

Occulis is a 1v1 tactical board game drawn in thin white wireframe on a near-black ground. The interface follows the same line. Build every screen from these components and tokens. Never invent colours, radii or fills.

## Setup

Wrap every screen in `UiRoot`. It sets the background (`--occ-bg`), the white ink, the monospace font and the base size. Without it, components fall back to the host page's font and background. Use `fullPage` for a whole page, and put page content in `<main className="occ-page">` (a centred column, max 1240px):

```jsx
<UiRoot fullPage>
  <TopBar section="back-office" tabs={[{ href: "#/", label: "Vue d'ensemble", current: true }]} />
  <main className="occ-page">
    <div className="occ-stack occ-enter">{/* page blocks */}</div>
  </main>
</UiRoot>
```

Use `ToastProvider` above any component that calls `useToast()`.

## The three rules of the art direction

1. **Sharp corners, hairlines, no fills.** There is no border-radius anywhere. Frames are 1px lines at low opacity (`--occ-ink-line`). Buttons are outlined, never filled: confirm with `variant="primary"` (a full white line), destroy with `variant="danger"`.
2. **Hierarchy by alpha, never by grey.** Text is white at decreasing opacity: `--occ-ink`, `--occ-ink-soft`, `--occ-ink-dim`, `--occ-ink-faint`, `--occ-ink-line`, `--occ-ink-ghost`. Labels and headings are small uppercase letter-spaced text (`className="occ-label"`).
3. **Colour means game information only.** `--occ-camp-a` (teal) and `--occ-camp-b` (orange) mark the two seats, players and winners. `--occ-selection` (yellow) marks the selected or pinned item. `--occ-legal` / `--occ-accepted` (blue) mark a legal move or an accepted action. `--occ-refused` / `--occ-threat` mark a refusal, a sanction or a destructive action. Account states stay white: `Badge` with `tone="strong"`, `"plain"` or `"dim"`. Only a suspension is `tone="refused"`. A match result uses `tone="A"` or `tone="B"`.

## Tokens and classes

Style your own layout glue with `var(--occ-*)` only:
- spacing `--occ-space-1…8` (4px steps: 4, 8, 12, 16, 20, 24, 32);
- type sizes `--occ-text-xs…xxl`, plus `--occ-caps` for letter-spacing;
- motion `--occ-ease`, `--occ-fast`, `--occ-base`, `--occ-slow`;
- `--occ-font-mono`, `--occ-bg`, `--occ-panel`.

Helper classes: `occ-page`, `occ-stack` (vertical blocks), `occ-enter` (staggered entrance), `occ-label`, `occ-muted`, and `occ-actions-cell` (the last table cell holding a `QuickBar`).

## Composition

- **Screen header:** `TopBar`, then a `PageHead` with `title`, `count` and `tools` (`SearchField` + `Button icon="plus"`).
- **Lists:** a `Card` around a `Table` plus a `Pager`. Rows show a `Person` (with `TileAvatar`, the player's initials in a board tile), a `BadgeRow` of states, and a `QuickBar` of `IconButton`s. Every `IconButton` needs a `label`; use `disabledReason` instead of a bare `disabled`.
- **Detail pages:** `BackLink`, a `Hero` (large `TileAvatar`, badges, meta, a framed `QuickBar`), an optional `Banner`, then `CardGrid` with `CardColumn`s of `Card`s (`StatGrid`/`Stat`, `InlineEdit`, `List`/`ListRow`).
- **A match:** a `Versus` header, a `FactStrip`, then a `MoveList` inside `<Card flush>` followed by a `Toolbar`. Move numbers and seats are coloured by camp.
- **Heavy actions** go through a `Dialog`, never through `confirm()`. Results go through `useToast()`. Empty or failed loads use `EmptyState`.

Real reference: every `components/<group>/<Name>/<Name>.prompt.md` has props and verified examples. `styles.css` holds every class above.
