# RAP-09 — Analyse d'écart vers un produit fini

> État au **2026-11-24** : dépôt au commit `6a6357a` de `staging` (22 novembre), backlog Nota
> « Tâches » du même jour (88 tâches ouvertes). Version mise en page :
> [2026-11-24-analyse-produit-fini.pdf](2026-11-24-analyse-produit-fini.pdf) (22 pages).
> Rapport daté : il ne remplace ni [STATE.md](../STATE.md), ni [rules.md](../design/rules.md),
> ni les [points ouverts](../design/open-points.md). Les décisions qu'il évoque restent à
> soumettre au porteur du projet.
>
> Depuis l'analyse, la PR #81 a traité l'appariement à trois joueurs simultanés (OCC-131).

Les suites de tests n'ont pas été relancées pour ce rapport et le jeu n'a pas été joué en
conditions réelles. Les pourcentages de maturité sont un jugement, pas une mesure.

## Priorités

- **P0** bloque toute mise en ligne publique ; **P1** nécessaire avant la beta ouverte ;
  **P2** nécessaire avant le 1.0 ; **P3** confort ou après le lancement.
- **Décision** : le travail ne commence pas sans arbitrage du porteur du projet.
- Chaque manque renvoie à sa tâche Nota. Les tâches OCC-133 à OCC-175 ont été créées à partir
  de ce rapport (champ « Source » : `RAP-09 §…`).

## 1. Synthèse

Occulis est techniquement très avancé et ludiquement encore provisoire. Le socle (moteur
déterministe, serveur autoritaire, comptes, social, back-office, rendu, CI/CD) est solide. Ce
qui manque : le **contenu de jeu définitif**, **l'accueil du joueur**, la **mise en production
réelle** et tout ce qui entoure un **lancement** (juridique, marque, distribution,
communauté). Maturité globale estimée : environ 55 %.

| Domaine                               | Maturité | Commentaire                                                  |
| ------------------------------------- | -------- | ------------------------------------------------------------ |
| Moteur de règles                      | 80 %     | Manquent promotion, autres capacités, piège différé          |
| Contenu (roster, cartes, équilibrage) | 25 %     | Tout est provisoire ; une seule carte active                 |
| Multijoueur et serveur                | 80 %     | Durcissement et performance                                  |
| Comptes et social                     | 75 %     | 2FA, journal admin, signalement absents                      |
| Expérience joueur                     | 45 %     | Pas de tutoriel, d'audio, de mobile ; thème non tranché      |
| Sécurité                              | 60 %     | better-auth vulnérable, audit du 23/11 à traiter             |
| Exploitation                          | 35 %     | Ni sauvegarde D1, ni alertes, ni suivi d'erreurs client      |
| Tests et qualité                      | 60 %     | Aucun test E2E du jeu                                        |
| Distribution                          | 15 %     | Rien en ligne publiquement ; Electron et Steam non commencés |
| Juridique et marque                   | 15 %     | Aucune CGU dans le jeu ; marque jamais vérifiée              |

Les dix manques qui comptent le plus : better-auth et l'audit de sécurité (P0) ; roster
définitif ; cartes définitives ; apprentissage du jeu ; sauvegarde D1 ; observabilité ;
marque ; cadre juridique du jeu ; cadence de jeu ; direction graphique figée.

## 2. Ce qui est déjà solide

Règles (hauteur, LOS, fog, mat, pat, nulles, piège, rulesets versionnés), serveur autoritaire
hibernable, file, salons, déploiement caché, reconnexion et forfait, spectateur, comptes
Better Auth complets (dont suppression de compte), amis, messages, blocage, back-office,
rendu isométrique, ATH, rejeu, i18n FR/EN, charte à jetons uniques, CI/CD et environnements
de branche, documentation.

## 3. Game design et contenu

| §   | Manque                                                                                   | Prio.        | Tâche   |
| --- | ---------------------------------------------------------------------------------------- | ------------ | ------- |
| 4.1 | Roster définitif : 3 places à capacité pour 2 types (éclaireur, trappeur), aucun chiffre | P1, décision | OCC-11  |
| 4.2 | Promotion des pions : actée le 2026-10-27, non codée ; pièce obtenue ouverte (OP 15)     | P1, décision | OCC-133 |
| 4.3 | Cartes définitives et zones de déploiement                                               | P1, décision | OCC-19  |
| 4.3 | Sélection de carte dans la file et les salons, aperçu avant déploiement                  | P1           | OCC-134 |
| 4.3 | Validateur de cartes (symétrie, LOS mutuelle, accessibilité) et éditeur minimal          | P2           | OCC-135 |
| 4.4 | Piège à déclenchement différé (file de résolution absente du moteur)                     | P3, décision | OCC-140 |
| 4.5 | Symétrie LOS / portée de vision (OP 19)                                                  | P2, décision | OCC-137 |
| 4.5 | Identité des pièces à travers le fog (OP 13)                                             | P3, décision | OCC-138 |
| 4.5 | Interprétations encodées à valider                                                       | P2, décision | OCC-22  |
| 4.5 | Seuil des 60 actions sans prise à recalibrer                                             | P3, décision | OCC-139 |
| 4.5 | Capacités spéciales (téléporteur, poussée, murs)                                         | P3, décision | OCC-18  |
| 4.6 | Statistiques d'équilibrage par ruleset dans le back-office                               | P1           | OCC-136 |
| 4.7 | Modes de jeu : à repousser après le 1.0                                                  | P3, décision | OCC-141 |

## 4. Expérience joueur

| §   | Manque                                                                         | Prio.        | Tâche              |
| --- | ------------------------------------------------------------------------------ | ------------ | ------------------ |
| 5.1 | Page « Comment jouer » dans le jeu et sur le site                              | P1           | OCC-142            |
| 5.1 | Tutoriel scripté                                                               | P1           | OCC-143            |
| 5.1 | Adversaire d'entraînement (IA) : le pilier n'interdit que le multijoueur local | P2, décision | OCC-144            |
| 5.2 | Direction graphique, silhouettes, alphabet, effet d'inversion                  | P1, décision | OCC-75, 21, 90, 89 |
| 5.3 | Menu, attente et bandeau sur la charte ; réglages communs                      | P2           | OCC-41, OCC-86     |
| 5.4 | Audio ; notification de tour (son, titre d'onglet, notification)               | P2           | OCC-91, OCC-147    |
| 5.5 | Responsive ; trackpad                                                          | P2           | OCC-95, OCC-84     |
| 5.6 | Accessibilité : daltonisme, contrastes, clavier des menus, réduire animations  | P2           | OCC-148            |
| 5.7 | Revanche depuis l'écran de fin                                                 | P2           | OCC-146            |
| 5.7 | Déconnexion adverse, salon par lien, montées, animations, favicon              | P2–P3        | OCC-38, 40, 42, 78 |

## 5. Compétitif, social et modération

| §   | Manque                                                                     | Prio.        | Tâche           |
| --- | -------------------------------------------------------------------------- | ------------ | --------------- |
| 6.1 | Cadence : temps illimité, un joueur connecté peut bloquer une partie       | P1, décision | OCC-145         |
| 6.2 | Appariement par écart d'Elo élargi avec l'attente                          | P3           | OCC-149         |
| 6.3 | Signalement de joueurs et file de modération                               | P1           | OCC-150         |
| 6.3 | Filtre de pseudos                                                          | P2           | OCC-151         |
| 6.4 | Rétention : statistiques personnelles, paliers d'Elo sur le profil, succès | P3, décision | OCC-152         |
| 6.5 | Chat (réactions, fenêtre) ; chat en partie à décider                       | P1 / P3      | OCC-76, OCC-175 |

## 6. Sécurité

Suivi existant : better-auth 1.7.7 et audit du 23/11 (P0, deux tâches en doublon à
fusionner), Audits 2 à 10, OCC-31 (2FA), OCC-32 (journal admin), OCC-33, OCC-37, OCC-81.

Angles morts créés : veille de dépendances automatique (OCC-153, P2), plan de réponse à
incident (OCC-154, P2), `security.txt` et politique de divulgation (OCC-155, P3), détection
des comptes multiples et du boosting d'Elo (OCC-156, P3).

## 7. Infrastructure et exploitation

| §   | Manque                                                                       | Prio.        | Tâche             |
| --- | ---------------------------------------------------------------------------- | ------------ | ----------------- |
| 8.1 | Sauvegarde D1 hors Cloudflare et exercice de restauration                    | P1           | OCC-97            |
| 8.2 | Suivi d'erreurs navigateur et alertes (5xx, Resend, D1, hibernation, budget) | P1           | OCC-157           |
| 8.2 | Tableau de bord produit (inscriptions, parties, attente)                     | P2           | OCC-158           |
| 8.3 | Politique de déploiement : compatibilité du protocole, parties en cours      | P1, décision | OCC-159           |
| 8.4 | Seed, URL de branche, proxy OAuth, script d'infra                            | P2           | OCC-25, 24, 9, 82 |
| 8.5 | Tests de charge                                                              | P2           | OCC-160           |
| 8.5 | Plan Workers Paid confirmé sur le compte de production                       | P2           | OCC-161           |
| 8.5 | Page de statut et annonces de maintenance                                    | P3           | OCC-162           |

## 8. Performance et qualité

- Audit de performance du 23/11 déjà découpé (Perf 1.1, 2.1, 3.1 en P1).
- Budget de performance vérifié en CI : OCC-164 (P3).
- Tests E2E du jeu (deux navigateurs contre `wrangler dev`, parcours critiques) : OCC-163 (P1).
- Refontes 2 à 5, Clean Code front et serveur : OCC-101 à 104, OCC-122, OCC-123.
- Hygiène du backlog (doublons, tâches sans identifiant) : OCC-121.

## 9. Distribution

| §    | Manque                                                                           | Prio.        | Tâche          |
| ---- | -------------------------------------------------------------------------------- | ------------ | -------------- |
| 11.1 | Mise en ligne du site : domaine, mentions complétées, déploiement CI, Open Graph | P1           | OCC-165        |
| 11.1 | URL de production figée                                                          | P2           | OCC-29         |
| 11.2 | Client Electron : authentification, build et signature                           | P2–P3        | OCC-28, OCC-30 |
| 11.3 | Le site promet une liste de souhaits Steam qui n'existe pas                      | P2           | OCC-166        |
| 11.3 | Steam : Steamworks, page magasin, ticket d'authentification, succès              | P2, décision | OCC-167        |

## 10. Juridique et conformité

| §    | Manque                                                                    | Prio. | Tâche   |
| ---- | ------------------------------------------------------------------------- | ----- | ------- |
| 12.1 | Marque « Occulis » face à « Oculus », domaines                            | P1    | OCC-23  |
| 12.2 | Jeu : mentions légales, CGU, confidentialité, acceptation à l'inscription | P1    | OCC-168 |
| 12.3 | RGPD : export des données, anonymisation, âge minimum, registre et DPA    | P1    | OCC-169 |
| 12.4 | Licences des actifs et dépendances, licence du dépôt                      | P2    | OCC-170 |

## 11. Lancement et modèle économique

| §    | Manque                                                                        | Prio.        | Tâche   |
| ---- | ----------------------------------------------------------------------------- | ------------ | ------- |
| 13.1 | Plan de beta : invitations, créneaux, retours, critères de sortie chiffrés    | P1           | OCC-171 |
| 13.2 | Communauté et support : Discord, contact, FAQ, contestation, notes de version | P2           | OCC-172 |
| 13.3 | Kit presse et trailer                                                         | P3           | OCC-173 |
| 14.1 | Modèle économique                                                             | P2, décision | OCC-174 |

## 12. Feuille de route proposée

1. **Assainir** (1–2 semaines) : sécurité P0 et Audits 2–5, sauvegarde D1, suivi d'erreurs,
   Perf P1, nettoyage du backlog ; lancer la vérification de marque.
2. **Contenu jouable complet** (4–8 semaines) : roster, promotion, 3 à 5 cartes, sélection de
   carte, cadence, statistiques d'équilibrage, tests E2E.
3. **Accueil du joueur** (4–6 semaines, en parallèle) : « Comment jouer », tutoriel, DA figée,
   audio et notification de tour, revanche, accessibilité.
4. **Prêt pour le public** (2–4 semaines) : nom et domaine, site en ligne, CGU, RGPD,
   signalement, 2FA admin, tests de charge, politique de déploiement.
5. **Beta fermée puis ouverte** (6–10 semaines) : invitations, Discord, itérations
   d'équilibrage, critères de sortie.
6. **Lancement 1.0**, puis Electron, Steam et modèle économique si décidés.

Chemin critique : roster → cartes → équilibrage en beta (décisions) ; marque → domaine →
site et Steam (délais externes). Les deux chaînes doivent démarrer tout de suite.
