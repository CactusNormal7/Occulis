# Le site vitrine — `apps/site`, `packages/board`

Une page publique, un seul objectif : l'inscription à la beta par email. Le pourquoi des
choix (stack, hébergement, stockage des adresses) est dans
[architecture.md § 8](../architecture.md#8-site-vitrine).

## Vue d'ensemble

```
apps/site/
  astro.config.mjs      Astro, sortie statique (dist/)
  wrangler.toml         le Worker « occulis-site » : assets + /api/*, D1, limiteur, cron
  migrations/           schéma de la base occulis-site (beta_signups)
  public/               polices, images capturées, icônes, og.png, _headers (CSP, cache)
  scripts/capture.mjs   produit images, og.png et icônes depuis le vrai rendu
  src/
    content/fr/         TOUS les textes : JSON par section, Markdown pour les pages légales
    i18n.ts             contentFor(locale) — la seule porte vers les textes
    tokens.ts           les propriétés --occ-* posées sur :root au build
    layouts/, components/, pages/
    island/             le plateau animé du hero (script.ts pur, board.ts canevas)
    worker/             l'API d'inscription (beta.ts pur, store.ts D1, mail.ts Resend)
packages/board/         rendu du plateau sans PixiJS, partagé avec apps/web
```

Le site ne dépend pas de `apps/web` : il dépend de `@occulis/core`, `@occulis/ui` (tokens)
et `@occulis/board`.

## Textes et langues

Tout texte affiché vit dans `src/content/fr/` (`site`, `hero`, `concept`, `differences`,
`gallery`, `beta`, `pages`, `footer`, `mail` en JSON ; mentions légales et confidentialité
en Markdown). Les composants reçoivent une `locale` et lisent `contentFor(locale)`.

Pour ajouter l'anglais : copier `content/fr/` en `content/en/`, l'enregistrer dans
`CONTENT` (`i18n.ts`), puis créer `src/pages/en/` sur le modèle de `src/pages/`. Le Worker
lit encore `content/fr/beta.json` (texte du consentement) et `mail.json` en dur ; il faudra
lui passer la langue du formulaire.

C'est une exception assumée à la règle d'AGENTS.md (« tout texte passe par
`@occulis/i18n` ») : ce sont des contenus éditoriaux, pas des messages d'interface du jeu.

L'emplacement Steam est `beta.steam` : `enabled: false` tant qu'il n'y a pas de page, et
rien n'est rendu sans `url`.

## Couleurs et typographie

`src/tokens.ts` pose sur `:root` les propriétés de `paletteVariables(THEMES.obsidian)` —
le thème par défaut du jeu, les trois thèmes n'étant pas tranchés. `site.css` ne lit que
ces propriétés ; `src/styles/colors.test.ts` échoue si une couleur apparaît dans un
`.css` ou un `.astro`, et la règle ESLint des couleurs couvre `apps/site/src/**/*.ts`.

Le focus clavier prend `--occ-selection` (c'est une sélection) ; un refus et un accord
prennent `--occ-refused` et `--occ-accepted`, comme dans le jeu. Le texte est en os plein
(16,4:1 sur le vide) ou en os à 62 % (6,4:1) ; l'os à 40 % (3,2:1) n'est jamais du texte.

Deux polices auto-hébergées sous `public/fonts/`, licences OFL jointes : Tiny5 (marque,
titres, boutons, toujours en multiples de 8 px) et Atkinson Hyperlegible Next 400/700
(texte courant), copiée depuis `@fontsource/atkinson-hyperlegible-next`.

## Le plateau du hero

`island/script.ts` (pur) joue cinq coups sur la carte des nouvelles parties (`ridge-1`)
avec les équipes par défaut : `buildFrames()` rend chaque position et la connaissance du
camp A (`observe()` de `core`). Un coup refusé lève une erreur ; `script.test.ts` vérifie
que la séquence reste légale, que le camp adverse est caché au départ, entièrement vu du
col, puis réduit à des fantômes.

`island/board.ts` dessine avec `@occulis/board/paint` (`terrainDrawables`, `drawPiece`) :

- tout se déduit du temps écoulé (`sightAt(now)`), sans état de transition ;
- la vue se déploie case par case depuis les pièces (`MOTION_FX.revealPerTileMs`) et se
  retire d'un bloc (`dimPerTileMs`) ; une pièce adverse n'est dessinée que sur une case
  éclairée, un souvenir (`remembered`) hors de vue devient un fantôme ;
- entre deux coups, rien ne bouge : `nextChange()` endort la boucle (`setTimeout`) au
  lieu de redessiner chaque image ; elle s'arrête aussi quand le plateau sort de l'écran
  ou que l'onglet est caché ;
- sous `prefers-reduced-motion`, une seule image fixe (`FRAMES.summit`).

`BoardIsland.astro` affiche d'abord l'image capturée (`board-summit-*.avif|webp`), qui
suffit sans JavaScript, puis importe `island/board.ts` quand le navigateur est libre
(`requestIdleCallback`). Le module pèse environ 8 Ko compressé, `core` compris.

## Images

`pnpm --filter @occulis/site capture` réutilise le serveur `astro dev` s'il tourne (sinon
en lance un), ouvre les pages `/capture/<image>/` — générées en développement seulement —
avec le Chrome installé (`playwright-core`, aucun navigateur téléchargé), et écrit :

- `public/images/board-{fog,summit,ghosts}-{720,1440}.{avif,webp}`, réduites au plus
  proche voisin ;
- `public/og.png` (1200 × 630), l'image de partage ;
- `public/favicon.svg`, `favicon.ico`, `apple-touch-icon.png` : l'œil des pièces, en os
  sur le vide, couleurs prises aux tokens.

Les images sont versionnées : à relancer quand le rendu, la carte ou le scénario change.

## L'inscription à la beta

### Route par route (`worker/index.ts`)

| Requête                            | Effet                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------ |
| `POST /api/beta`                   | `signup()` ; JSON `{ code }` si `Accept: application/json`, sinon 303    |
| `GET /api/beta/confirm?token=`     | `confirm()` → `/confirmation/` ou `/lien-invalide/`                      |
| `GET /api/beta/unsubscribe?token=` | 303 vers `/desinscription/?token=`, qui demande un clic                  |
| `POST /api/beta/unsubscribe`       | `unsubscribe()` → `/desinscription-faite/` ; 200/400 pour le clic unique |
| cron quotidien (`17 3 * * *`)      | `purgePending()` : efface les attentes de plus de sept jours             |

Les codes de `signup()` : `sent`, `invalid-email`, `consent-required`, `too-many`,
`failed`. Le formulaire (`BetaForm.astro`) fonctionne sans JavaScript (303 vers
`/inscription-envoyee/` ou `/inscription-refusee/`) ; avec, il reste sur place et annonce
le message de `beta.messages` dans une région `role="status"`.

### `worker/beta.ts` — la logique, sans Cloudflare

- `signup()` : champ piège rempli ou envoi moins de 2,5 s après l'affichage → réponse
  `sent` sans rien garder ; adresse normalisée (`normalizeEmail`) ; consentement exigé ;
  limite de débit ; une adresse déjà confirmée reçoit `sent` sans message (rien ne se
  devine) ; sinon l'attente est créée ou renouvelée et le lien part.
- Le jeton de confirmation est aléatoire (32 octets) ; seule son empreinte SHA-256 est
  stockée. Il sert une fois et expire après `PENDING_TTL_MS` (sept jours).
- Le jeton de désinscription n'est stocké nulle part : `id.HMAC(BETA_SECRET, id)`,
  comparé en temps constant. Un second clic reste un succès.
- Le texte exact de la case cochée est enregistré avec l'adresse (`consent_text`).

`beta.test.ts` couvre ces cas avec un stockage en mémoire.

### Stockage (`worker/store.ts`, `migrations/`)

Une table, `beta_signups` : `id`, `email` (unique), `status` (`pending` | `confirmed`),
`confirm_token_hash`, `consent_text`, `created_at`, `confirmed_at`. Une désinscription
efface la ligne ; rien d'autre n'est conservé, ni IP ni agent.

### Messages (`worker/mail.ts`)

Resend, comme les courriers du jeu. `MAIL_TO_CONSOLE = "on"` journalise au lieu
d'envoyer (local). Hors de ce mode, une clé absente est un **échec** (`failed`), jamais un
succès muet. Chaque message porte `List-Unsubscribe` et `List-Unsubscribe-Post`
(désinscription en un clic, RFC 8058).

### Sécurité

- `public/_headers` : CSP sans script en ligne (`assetsInlineLimit: 0` dans Astro), styles
  en ligne autorisés pour les tokens ; seul Cloudflare Web Analytics est permis en dehors
  du site, et seulement s'il est activé.
- Un `POST /api/beta` dont l'`Origin` n'est ni le site ni l'hôte de la requête est refusé (403).
- Limiteur Workers `BETA_LIMIT` : cinq envois par minute et par `CF-Connecting-IP`.

## Mesure d'audience

Cloudflare Web Analytics, sans cookie : le script n'est inclus que si
`PUBLIC_CF_ANALYTICS_TOKEN` est fourni au build. Aucun bandeau n'est nécessaire.

## Commandes

```bash
pnpm --filter @occulis/site dev        # astro dev, http://localhost:4321
pnpm --filter @occulis/site build      # dist/
pnpm --filter @occulis/site test       # vitest
pnpm --filter @occulis/site typecheck  # astro sync + tsc (site et Worker)
pnpm --filter @occulis/site capture    # images, og.png, icônes
```

Le parcours complet en local (`.dev.vars` copié depuis `.dev.vars.example`) :

```bash
pnpm --filter @occulis/site build
pnpm --filter @occulis/site exec wrangler d1 migrations apply occulis-site --local
pnpm --filter @occulis/site preview    # wrangler dev, http://localhost:8787
```

`astro check` n'est pas utilisé : `@astrojs/check` ne se charge pas dans ce monorepo pnpm
(dépendance `@emnapi/runtime` introuvable). Le frontmatter des `.astro` n'est donc pas
typé ; tout le TypeScript des modules l'est.

## Avant la mise en ligne

Le déploiement n'est pas branché sur la CI. Voir la liste dans
[architecture.md § 8](../architecture.md#8-site-vitrine).
