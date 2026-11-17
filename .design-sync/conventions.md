# Occulis UI — conventions

Occulis is a competitive 1v1 tactical board game in 2D isometric view — "a liturgy of the void": light pixel art, mystical and cryptic. The interface is drawn in the same hand as the board: a pixel font, one-pixel frames with notched corners, a void ground with star dust, and bone-coloured ink. Build every screen from these components and tokens; never invent a colour, a radius or a fill.

## Setup

Wrap every screen in `UiRoot`. It sets the ink (`occ-ink`), the pixel font (`--occ-font-pixel`, Tiny5) and the base size (`occ-text-md`, line-height 1.5). Use `fullPage` for a whole page: it adds the void (`occ-bg`), the aura halo (`occ-aura`) and two twinkling star fields (`occ-star`, `occ-star-faint`). Without `fullPage` the root stays transparent and sits on its host's matter (a game panel). Put page content in `<main className="occ-page">` (a centred column, max 1240px) and blocks in `occ-stack`. Use `ToastProvider` above any component that calls `useToast()`. Switch theme with `data-theme="obsidian" | "reliquary" | "astral"` on the root element.

```jsx
<UiRoot fullPage>
  <TopBar section="back-office" tabs={[{ href: "#/", label: "Overview", current: true }]} />
  <main className="occ-page">
    <div className="occ-stack occ-enter">{/* page blocks */}</div>
  </main>
</UiRoot>
```

## Content fundamentals

- Every visible text exists in English and French; English is the default and the source. Components that show their own words ("Cancel", "Continue with Google") follow the active `LocaleProvider` / `UiRoot locale`.
- Labels, buttons, badges, tabs and headings are short and set in uppercase with `occ-caps` letter-spacing (`className="occ-label"`). Field labels are the exception: lowercase, dimmed.
- Plain, factual, terse. Facts over adjectives: "26–50 of 132". No exclamation marks, no emoji.
- Destructive actions name what they do ("Suspend", "Delete"), and go through a `Dialog` with a `Note` explaining the consequence — never `confirm()`.

## Visual foundations

**Three materials only.**

1. **The void** — `occ-bg`, `occ-surface`, `occ-panel`, and the board matter `occ-matter` → `occ-matter-peak`, `occ-shade`. Near-blacks that carry the board and the panels. Cards and fields sit on `occ-surface`; a modal's backdrop is a two-pixel dither of `occ-bg` (`--pixel-dither`), never a blur.
2. **Bone** — `occ-ink` and its alphas. Hierarchy is read by alpha, never by grey: `occ-ink` (values, headings), `occ-ink-soft` (body, labels), `occ-ink-dim` (metadata), `occ-ink-faint` (disabled, strong rules), `occ-ink-line` (every frame), `occ-ink-ghost` (hover wash). `occ-ink-dim` measures about 3.2:1 on `occ-bg` in every theme: never use it for text a player must read.
3. **Glows** — saturated and rare, reserved for game information. A glow always means something.
   - `occ-camp-a` / `occ-camp-b`: the two seats, their pieces, move numbers and a match result (`Badge tone="A" | "B"`). Provisional colours.
   - `occ-selection`: the selected piece, chosen row or pinned move. Never a camp.
   - `occ-legal` / `occ-accepted`: a legal move, an accepted action, a success toast.
   - `occ-threat` / `occ-refused`: a threat, a refusal, a sanction, a destructive button, the last five seconds of a `CountdownRing`.
   - Account states stay in bone (`Badge tone="strong" | "plain" | "dim"`); only a suspension takes `tone="refused"`.

**Development signal.** `occ-caution` / `occ-caution-ground` (a yellow-and-black tape, identical under every theme) belong to `WorkInProgress` alone. They mean "unfinished, possibly placeholder", not game information, and leave with the element once it is finished.

**Themes.** Three dark proposals share the grammar and change only matter and light; none is decided yet. _Obsidian_ (default) — grey neutral matter, cold bone, icy cyan and red glows. _Reliquary_ — warm brown-black, golden bone, mint and orange glows, fireflies. _Astral_ — plum-black, a dense star vault, cyan and magenta glows. The `occ-swatch-*` tokens are identical under every theme so a theme picker shows each proposal in its own colours.

**Type.** Tiny5 (SIL OFL) everywhere, drawn on an 8px grid, so every size is a multiple of 8 (`occ-text-*`: 16, 24, 32, 48) and font smoothing is off. Headings glow softly with `occ-ink-glow`. System monospace (`--occ-font-mono`) only for code, long data and HTML mail.

**Spacing.** A 4px scale: `occ-space-1` (4) to `occ-space-8` (32); there is no step 7. Card padding is `18px occ-space-5`.

**Shape.** No border-radius anywhere. A frame is a 1px `occ-ink-line` border with two pixels clipped off each corner (`clip-path: var(--pixel-notch)`). Buttons are bevelled like keys (an inner shadow at the foot that vanishes on press); fields are hollow (shadow at the top). Only `Button variant="primary"` is filled — with bone, text in `occ-bg`. The `TileAvatar` replaces round avatars with a 2:1 board tile.

**Motion.** Pixels show, motion never stutters: continuous transitions on `--occ-ease` (`cubic-bezier(0.2, 0.7, 0.2, 1)`), `--occ-fast` 150ms, `--occ-base` 250ms, `--occ-slow` 420ms; glows breathe on `--occ-breath` 3.2s, never blink. A window opened by a click unfolds from a one-pixel frame (`revealWindow`) — from its centre for modals and toasts. Blocks fade in whole (`occ-enter`), never staggered. A screen appears in one piece: no skeleton flashes on a fast answer. Everything decorative stops under `prefers-reduced-motion`; information (a countdown) never depends on an animation.

**Focus.** `:focus-visible` draws a 1px dashed `occ-ink-soft` outline, 2px off the element (at least 6:1 on `occ-bg` and `occ-surface` in every theme).

## Iconography

Twenty-nine stroke icons on a 24 grid (`Icon`), 1.6 stroke, round caps, never filled, always `currentColor`. An icon alone says nothing: every `IconButton` takes a `label` (shown as a tooltip) and `disabledReason` instead of a bare `disabled`. The Google logo in `ProviderButton` is monochrome too. There is no logo file: the mark is the wireframe `cube` icon followed by the uppercase wordmark (`occ-wordmark` spacing) — use `Wordmark`.

## Classes

Style your own layout glue with `var(--occ-*)` only. Helper classes: `occ-page`, `occ-stack` (vertical blocks), `occ-enter` (a single fade-in of the whole block, never staggered), `occ-label`, `occ-muted`, and `occ-actions-cell` (the last table cell holding a `QuickBar`).

## Composition

- **Screen header:** `TopBar`, then `PageHead` with `title`, `count` and `tools` (`SearchField` + `Button icon="plus"`).
- **Lists:** a `Card` around a `Table` and a `Pager`. Rows show a `Person` (with `TileAvatar`), a `BadgeRow` and a `QuickBar` of `IconButton`s in the last cell (`occ-actions-cell`).
- **Detail pages:** `BackLink`, `Hero`, an optional `Banner`, then `CardGrid` with `CardColumn`s of `Card`s (`StatGrid`/`Stat`, `InlineEdit`, `List`/`ListRow`).
- **A match:** `Versus`, a `FactStrip`, then a `MoveList` inside `<Card flush>` followed by a `Toolbar`.
- **Account flows:** `FormPanel` with `FormMessage`, `TextField`/`PasswordField`, `Divider` and `ProviderButton`; one form and one URL per flow.
- **Settings:** `SettingList` of `SettingRow`s that unfold a `SettingEditor` in place.
- Results go through `useToast()`; empty or failed loads use `EmptyState`.
- **Unfinished elements:** wrap them in `WorkInProgress` (with a `note` saying what is missing) whenever placeholder data is shown.

## Not synced

- `--occ-font-pixel`, `--occ-font-mono` and the motion values live in `components/bundle.css`, because `tokens.json` has no place for font stacks or motion; edit them in `packages/ui/src/tokens.ts`.
- The proposed redesign tokens (`PROPOSED`) and the lab components (`src/lab/`) are not included: no screen uses them yet. They live in the lab (`/lab/`), next to this design system.
