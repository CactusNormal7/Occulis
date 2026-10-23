## Summary

<!-- Explain the user-facing and technical intent. Link the Notion task. -->

Closes or relates to:

## Validation

- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm format:check`
- [ ] `pnpm build` when the change affects buildable code

## Contribution checklist

- [ ] The relevant technical documentation changed with the implementation.
- [ ] All displayed text is available in English and French through `@occulis/i18n`.
- [ ] No color was added outside `packages/ui/src/tokens.ts`.
- [ ] `packages/core` remains deterministic.
- [ ] A gameplay rule is backed by a decision in `docs/design.md`.
- [ ] A screenshot or recording is attached when the interface changed.
