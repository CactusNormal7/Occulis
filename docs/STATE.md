# État du projet

Plafond ~60 lignes. Les entrées plus anciennes partent dans [history/](history/) ; l'état détaillé au 2026-10-21 est dans [history/state-2026-10-21.md](history/state-2026-10-21.md). Mis à jour : 2026-10-21.

## Jeu (`packages/core`)
- En place : plateau à hauteur, LOS occultée par le relief **et par les pièces**, verticalité, déplacement avec blocage mutuel, tours alternés, fog of war avec mémoire fantôme, historique et rejeu, abandon.
- **Retirés** sur décision du porteur : capture, échec et mat, pat, nulles (règle « échecs strict » injouable avec les portées du roster provisoire). **Une partie ne se termine que par abandon.** Voir [open-points](design/open-points.md) 13.
- Non implémenté (points ouverts) : attaque à distance différée, pièges, roster définitif. Seule la composition d'équipe est actée (1 maîtresse, 3 pièces à capacité, 4 pions).
- Roster et cartes **provisoires** : rien ne s'équilibre dessus. Interprétations encodées : [implementation-notes.md](implementation-notes.md).

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

## Vérifié le 2026-10-21
- `pnpm test` : 111 tests `core`, 10 `i18n`, 28 `tooling/infra`. Les autres paquets n'ont pas été recomptés : ne pas citer de chiffre sans relancer.

## Prochaines décisions à soumettre
- Roster, capture et fin de partie (open-points 12 et 13), identité des pièces à travers le fog.
- Choix du thème ; migration du menu, de l'attente et du bandeau vers la charte.
- Points ouverts d'infra : [architecture.md](architecture.md) §7.
