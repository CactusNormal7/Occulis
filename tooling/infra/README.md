# @occulis/infra

TUI d'outillage Cloudflare (Ink + React). Lancée par `pnpm infra` à la racine.

Reprend à l'identique la logique de l'ancien `scripts/infra.sh` :

- enveloppe `pnpm exec wrangler` depuis `apps/server` ;
- `--env` obligatoire pour staging / production (les bindings ne sont pas hérités) ;
- reporte automatiquement les `database_id` dans `apps/server/wrangler.toml` ;
- refuse migrations et déploiement tant que l'`database_id` visé est un placeholder.

**Créer / Supprimer un environnement de branche** opèrent sur la branche courante :
bloc `[env.<slug>]` de `wrangler.toml`, base D1 distante, entrée de
`.github/deploy-environments.json` — puis `git commit` de ces deux fichiers seulement
(pathspec, le reste de l'index est laissé tel quel) et `git push`. La suppression détruit
aussi le Worker et la base distante, et demande de retaper le nom de la branche.

## Navigation

- `↑` `↓` / `j` `k`, chiffres `1`-`9` puis `0`, **clic** et **molette** ;
- `Entrée` valide, `Échap` / `q` recule ou quitte ;
- dans un panneau de sortie : molette ou `↑` `↓` pour défiler l'historique.

## Structure

| Fichier           | Rôle                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------- |
| `src/cli.tsx`     | boucle : monte la TUI, cède le terminal aux commandes interactives (`dev`, `tail`, `login`) |
| `src/actions.ts`  | catalogue des actions et leur logique                                                       |
| `src/wrangler.ts` | runners de process (streamé / hérité)                                                       |
| `src/toml.ts`     | lecture et patch des `database_id`                                                          |
| `src/components/` | `App` (machine à états), `SelectList`, `OutputPane`, `useMouse` (suivi souris SGR)          |
