# Occulis — Document de conception : sommaire

Le document unique de game design a été scindé selon sa fréquence de lecture. **La numérotation d'origine est conservée** : une référence « design.md 5.1 » (dans le code, les docs ou les notes) se retrouve avec la table ci-dessous.

| Fichier                                        | Contenu                                                                                                                                      | À lire                                             |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| [design/rules.md](design/rules.md)             | Règles actées : pitch, piliers, capture, pièges, LOS/hauteur/fog, déploiement, mat et nulles (suspendus), choix technique, DA et caméra, nom | toute question de règle                            |
| [design/open-points.md](design/open-points.md) | Points ouverts, à soumettre au porteur du projet                                                                                             | avant d'implémenter ce qui n'est pas dans rules.md |
| [design/history.md](design/history.md)         | Idées de tour et de capture écartées                                                                                                         | avant de reproposer une règle                      |

## Table de correspondance

| Section d'origine                        | Fichier                                          |
| ---------------------------------------- | ------------------------------------------------ |
| 1 Pitch, 2 Piliers                       | rules.md                                         |
| 3.1 Mêlée, 3.2 Attaque à distance        | rules.md                                         |
| 3.3 Point ouvert                         | open-points.md § 3.3                             |
| 4 Pièges                                 | rules.md (point ouvert : open-points.md § 4)     |
| 5.1 à 5.5 LOS, hauteur, fog, spectateurs | rules.md (points ouverts : open-points.md § 5.3) |
| 6 Historique des itérations              | history.md                                       |
| 7 Déploiement, 7.1 Mat, 7.2 Nulles       | rules.md                                         |
| 8 Choix technique, 8.1 DA et caméra      | rules.md                                         |
| 9 Nom du projet                          | rules.md                                         |
| 10 Points ouverts (numéros 1 à 13)       | open-points.md § 10                              |

Autres documents : [refonte-graphique.md](design/refonte-graphique.md) (refonte de la charte), [implementation-notes.md](implementation-notes.md) (interprétations encodées faute de décision), [architecture.md](architecture.md) (infrastructure et invariants).
