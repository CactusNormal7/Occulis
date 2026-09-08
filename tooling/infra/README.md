# @occulis/infra

TUI d'outillage Cloudflare (Ink + React). Lancée par `pnpm infra` à la racine.

Reprend à l'identique la logique de l'ancien `scripts/infra.sh` :

- enveloppe `pnpm exec wrangler` depuis `apps/server` ;
- `--env` obligatoire pour staging / production (les bindings ne sont pas hérités) ;
- reporte automatiquement les `database_id` dans `apps/server/wrangler.toml` ;
- refuse migrations et déploiement tant que l'`database_id` visé est un placeholder.

**Créer un environnement de branche** opère sur la branche courante : bloc `[env.<slug>]`
de `wrangler.toml`, base D1 distante, entrée de `.github/deploy-environments.json` — puis
`git commit` de ces deux fichiers seulement (pathspec, le reste de l'index est laissé tel
quel) et `git push`.

**Supprimer un environnement de branche** prend au contraire une **cible explicite** :
n'importe quel environnement, depuis n'importe quelle branche, désigné par son slug
wrangler ou par le nom de sa branche (confirmation en le retapant). Un environnement reste
ainsi supprimable une fois sa branche fusionnée ou effacée. Il détruit le Worker et la base
distante, retire le bloc et l'entrée, et committe sur la branche courante — en prévenant
quand celle-ci n'est pas la branche de l'environnement supprimé, qui garde alors sa propre
copie du manifeste.

## À distance (sans poste local allumé)

`.github/workflows/infra.yml` (déclenchement manuel, `workflow_dispatch`) exécute
n'importe quelle action non interactive de ce catalogue sur les runners GitHub — pratique
depuis un téléphone ou un navigateur. Il réutilise `src/actions.ts` via `src/ci.ts`, la
variante sans TUI (`pnpm run ci -- <action> [env] [query]`) : mêmes actions, mêmes garde-fous,
aucune logique dupliquée. `dev`, `tail` et `login` en sont exclus (ils exigent un vrai
terminal) — pour ceux-là, ou pour la navigation visuelle, `pnpm infra` en local reste l'outil.

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
