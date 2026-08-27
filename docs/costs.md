# Occulis — Estimation des coûts

Chiffrage de l'infrastructure décidée dans [architecture.md](architecture.md).

Les hypothèses de volume et les tarifs sont explicités ci-dessous : les revérifier avant de
s'appuyer dessus pour une décision d'engagement, les grilles Cloudflare évoluent. Tarifs relevés
en août 2026 sur la page du plan Workers Paid.

Plan **Workers Paid — 5 $/mois**, qui inclut 10 M de requêtes Worker, 1 M de requêtes Durable
Object, 400 K GB-s de durée DO, 1 Go de stockage DO, 25 Md de lignes D1 lues, 50 M écrites et
5 Go de stockage D1.

Hypothèses : ~60 actions par partie, 2 connexions WebSocket, ~50 requêtes Worker par session.
Arrondi à 100 requêtes DO par partie pour garder de la marge.

| Volume | Requêtes DO | Requêtes Worker | Lignes D1 écrites | Coût/mois |
|---|---|---|---|---|
| Dev + beta fermée (500 parties) | 50 K | 25 K | 28 K | **5 $** |
| 1 000 joueurs (20 K parties) | 2 M | 1 M | 1,1 M | **5,15 $** |
| 5 000 joueurs (50 K parties) | 5 M | 2,5 M | 2,75 M | **5,60 $** |
| 1 M de parties | 100 M | 50 M | 55 M | **~32 $** |

Détail du dernier palier : 99 M de requêtes DO en dépassement × 0,15 $ = 14,85 $, plus 40 M de
requêtes Worker × 0,30 $ = 12 $, plus 5 M de lignes D1 × 0,001 $ = un demi-centime.

Le seul levier de coût réel est le **nombre de coups joués** (requêtes DO, 0,15 $/million).
Le reste est négligeable de plusieurs ordres de grandeur : écrire 55 M de lignes en D1 coûte
un demi-centime. Cloudflare ne facture pas l'egress.

## L'hibernation est une condition, pas une optimisation

Un Durable Object gardant un WebSocket ouvert sans hiberner occupe 128 Mo en permanence, soit
~10 800 GB-s par jour et par partie : les 400 K GB-s inclus partiraient en ~37 parties-jours.
Avec hibernation, une partie ne consomme que son temps de calcul réel (~0,6 GB-s), soit
~640 000 parties dans le forfait. **Facteur ~20 000.** Si l'implémentation du DO rate
l'hibernation, la facture explose sans signal préalable — à couvrir par un test.

## Non chiffré

Les tarifs de dépassement pour la **durée DO**, le **stockage DO** (>1 Go) et le **stockage D1**
(>5 Go) n'ont pas été relevés. Ils ne mordent qu'au dernier palier : 5 Go de D1 représentent
1 à 2 millions de parties d'historique au format log d'actions. Au-delà, archiver vers R2.

## Coûts hors hébergement

L'hébergement est le poste le moins cher de la sortie du jeu.

| Poste | Coût |
|---|---|
| Cloudflare | 60 $/an |
| Domaine | ~12 €/an |
| Compte développeur Apple (signature macOS) | 99 $/an |
| Certificat de signature Windows | ~100–400 $/an |
| Steam Direct | 100 $ une fois |

La signature de code coûte plus cher que les serveurs. Sur dépôt privé, surveiller les minutes
GitHub Actions (2 000/mois gratuites) : les 6 000 minutes de build du plan Cloudflare ne
couvrent que les builds lancés par Cloudflare.

