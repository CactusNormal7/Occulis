# État du projet

Plafond ~60 lignes. Les entrées plus anciennes partent dans [history/](history/) ; l'état détaillé au 2026-10-21 est dans [history/state-2026-10-21.md](history/state-2026-10-21.md). Mis à jour : 2026-10-29.

## Jeu (`packages/core`)

- En place : plateau à hauteur, LOS occultée par le relief **et par les pièces**, verticalité, déplacement avec blocage mutuel, tours alternés, fog of war avec mémoire fantôme, historique et rejeu, abandon.
- **Retirés** sur décision du porteur : capture, échec et mat, pat, nulles (règle « échecs strict » injouable avec les portées du roster provisoire). **Une partie ne se termine que par abandon.** Voir [open-points](design/open-points.md) 13.
- Non implémenté (points ouverts) : pièges, roster définitif. Plus d'attaque à distance (décision du 2026-10-27). Seule la composition d'équipe est actée : 1 roi, 3 pièces à capacité, 2 pions (décision du 2026-10-27, ouverte à modification, `rules.md` §7) : ruleset `provisional-2` ; `provisional-1` (1/3/4) reste chargeable.
- Roster et cartes **provisoires** : rien ne s'équilibre dessus. Interprétations encodées : [implementation-notes.md](implementation-notes.md).

## Règles décidées le 2026-10-27 (non implémentées sauf mention)

- Un tour : une seule pièce se déplace **ou** utilise une capacité, jamais les deux. Vaut pour toutes les capacités.
- Capture de mêlée : en arrivant sur la case de la pièce adverse, comme aux échecs. Une pièce alliée bloque toujours. C'est un déplacement : sur une case plus haute, mêmes règles de hauteur ; par une capacité, bornée par sa portée et sa LOS.
- On ne peut pas passer son tour (déjà le cas dans le code).
- Déplacements proches des échecs : lignes droites et diagonales, ou très courte portée.
- Hauteur : un déplacement long ne comporte aucune montée, même de 1 niveau. Descendre est libre. Dès qu'il faut monter, le mouvement s'arrête. **Déjà implémenté** (`movement.ts`).
- Grimper : capacité de toutes les pièces. **Déjà implémenté**, désormais acté.
- Promotion : seuls les pions se promeuvent, sur une case de promotion définie par la carte. Pièce obtenue : plus tard (une pièce de l'équipe, ou une pièce spéciale plus forte) ; visibilité non définie.
- Murs créés par une capacité : traités comme des pièces. Posé hors de la LOS de l'adversaire, un mur reste invisible pour lui jusqu'à ce qu'il puisse l'apercevoir normalement (orientation du porteur, à confirmer à l'implémentation). La capacité elle-même reste une idée.
- Pas d'attaque à distance : toutes les captures se font en mêlée. L'attaque différée du repo est écartée ; open-points 1, 2, 3 et 6, sections 3.3 et 5.3, sans objet. Le 12 (roster) reste ouvert.
- Les types des pièces adverses sont connus avant la partie, jamais leurs positions. Mécanisme de révélation non défini.
- Cartes de taille similaire, avec moins de murs.
- Composition d'équipe : le joueur la compose dans les quotas (déjà en place).
- Vocabulaire : « roi » remplace « pièce maîtresse » dans les docs et textes affichés ; les identifiants (`commander`, `isCommander`…) ne changent pas.

## Idées, non décidées

- Un mat est souhaité, en comptant sur les capacités pour le rendre jouable ; l'expérience dira. La condition de victoire n'est pas tranchée.
- Poison à échéance (la pièce meurt dans X tours, purge possible mais forte), ou poison presque aussi difficile à déclencher qu'une capture normale. À voir plus tard.
- Rounds (manches), éventuellement selon un mode de jeu, sans forcer la condition de victoire. À voir plus tard.

## Multijoueur (`apps/server`)

- Fonctionnel de bout en bout : file rapide (acceptation en 15 s), salons privés par code, déploiement de l'équipe (90 s), sièges, arbitrage de tour, vues par joueur, log en D1, clôture.
- Comptes Better Auth (PBKDF2 conservé), vérification d'adresse, réinitialisation, HIBP, Google, profil, back-office (`/admin/`, usurpation d'une heure), Elo (file rapide seule, aucun classement), amis, messages privés, défi direct, spectateur.
- **Avant une mise en ligne publique** : provisionner `AUTH_SECRET` et `RESEND_API_KEY` par environnement ([setup.md](setup.md) §7) et faire vérifier le domaine d'envoi chez Resend.
- Pièges vérifiés par tests : échéances Better Auth en texte ISO 8601 ; sa limitation de débit valide `CF-Connecting-IP` ; la bordure Cloudflare plafonne PBKDF2 à 100 000 itérations (workerd local non) — PBKDF2 impose le plan Workers Paid. Une suite verte dans workerd ne dit rien des limites de la bordure.

## Client (`apps/web`, `packages/ui`)

- Rendu isométrique pixel art (tampon réduit, plateau agrandi au plus proche voisin), 3 thèmes non tranchés (Obsidienne, Reliquaire, Astral), animations pures du temps.
- **Voile tramé du changement de thème : acté, verrouillé par `veil.test.ts`, ne jamais le retoucher sans demande explicite.**
- Aucune partie locale (hot-seat retiré, implementation-notes 18). Un coup se joue au clic ou par saisie de coordonnées ; la sélection filtre `legalActions`, elle ne redéduit jamais la légalité.
- Charte `@occulis/ui` portant back-office, profil, compte, préparation. Le menu, l'attente et le bandeau de partie n'y ont pas migré.

## Site vitrine (`apps/site`) — 2026-10-29

- Page unique (Astro statique, Worker `occulis-site`), inscription beta en double opt-in sur une D1 dédiée. Décision : [architecture.md](architecture.md) §8 ; fonctionnement : [technical/site.md](technical/site.md).
- Rendu Canvas 2D du plateau extrait dans `packages/board`, partagé avec `apps/web`.
- Non en ligne : domaine, identité de l'éditeur et contact à fournir ; base, secrets et Resend à provisionner ; pas de déploiement CI.

## Outil de gestion de projet — 2026-10-28

Décision : Nota (base « Tâches », espace Tengram Ydays) remplace Notion comme outil de gestion de projet par défaut.
Raison : choix de Jules, Nota devient l'outil de référence.
Conséquences :

- Les statuts, priorités et dates se mettent à jour dans Nota ; Notion n'est plus la source de vérité.
- Base resynchronisée le 2026-10-28 (OCC-1 à OCC-128, 120 lignes). Chaque ligne garde son « Lien Notion ».
- Les prompts et docs qui disent « passer la tâche Notion en Fait » (ex. prompt des Refontes 1-5, bilan hebdomadaire) sont à mettre à jour vers Nota (OCC-121).

## Vérifié le 2026-10-21

- `pnpm test` : 111 tests `core`, 10 `i18n`, 28 `tooling/infra`. Les autres paquets n'ont pas été recomptés : ne pas citer de chiffre sans relancer.

## Prochaines décisions à soumettre

- Types et capacités des 3 pièces à capacité (« ça dépendra »), révélation des types adverses, pièce obtenue par promotion et sa visibilité, détails des murs (à la création de la capacité), identité des pièces à travers le fog (open-points). Capture : règle décidée le 2026-10-27, à réimplémenter. Condition de victoire : non tranchée.
- Choix du thème ; migration du menu, de l'attente et du bandeau vers la charte.
- Points ouverts d'infra : [architecture.md](architecture.md) §7.
