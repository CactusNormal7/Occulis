-- Le pseudo devient unique sans casse **ni accents** : « Élodie » et « élodie », « ΑΛΦΑ »
-- et « αλφα » sont un même nom pour qui les lit, donc un moyen d'usurpation. L'index
-- `players_handle_nocase` (0006) ne repliait que l'ASCII, comme tout `NOCASE` de SQLite.
--
-- SQLite ne sait pas retirer un accent : la clé est calculée par le Worker
-- (`handleKey()`, `apps/server/src/auth/handle.ts`) à chaque écriture d'un pseudo.
-- Pour un pseudo tout en ASCII imprimable, elle vaut simplement `lower(handle)` : la
-- migration la pose donc elle-même, sans conflit possible puisque 0006 tient déjà ces
-- pseudos uniques à la casse près. Les autres sont complétés par le ménage nocturne
-- (`maintenance.ts`), qui journalise un éventuel doublon au lieu de le trancher.
ALTER TABLE players ADD COLUMN handle_key TEXT;

UPDATE players SET handle_key = lower(handle) WHERE handle NOT GLOB '*[^ -~]*';

CREATE UNIQUE INDEX players_handle_key ON players (handle_key) WHERE handle_key IS NOT NULL;
