# Protections de `staging` et `main`

Cette configuration se règle dans les rulesets GitHub du dépôt et complète les fichiers
versionnés `CODEOWNERS` et le workflow CI.

Pour les deux branches, appliquer les règles suivantes :

1. Refuser les pushes directs et exiger une pull request.
2. Exiger le succès du workflow **CI/CD / Vérifications** avant fusion.
3. Exiger une approbation, y compris la revue CODEOWNERS pour les chemins concernés.
4. Autoriser `@CactusNormal7` seul à fusionner et à contourner les protections.
5. Interdire la suppression de branche et les force-pushes.

`staging` reçoit les PR de travail. `main` ne reçoit que les PR validées venant de
`staging`; son déploiement correspond à la production.
