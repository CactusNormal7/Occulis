-- L'écran de fin d'une partie n'est ouvert qu'à ses deux joueurs, et se ferme pour de bon
-- quand tous deux l'ont quitté, lien compris : chaque camp note ici l'instant de son
-- départ (`me/queries.ts`, `leaveMyDebrief()`). `NULL` : le joueur ne l'a pas encore quitté.
ALTER TABLE matches ADD COLUMN debrief_left_a INTEGER;

ALTER TABLE matches ADD COLUMN debrief_left_b INTEGER;
