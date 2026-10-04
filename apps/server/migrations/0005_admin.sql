-- Greffon `admin` de Better Auth : rôle et bannissement sur le compte, usurpation sur la
-- session. Base du back-office (docs/technical/server.md, « `admin/` »).
--
-- Les cinq `ALTER` sont **générés** (`pnpm --filter @occulis/server auth:schema`, qui
-- rejoue les migrations précédentes et ne recrache que le delta) et recopiés tels quels.
alter table "users" add column "role" text;
alter table "users" add column "banned" integer default 0;
alter table "users" add column "ban_reason" text;
alter table "users" add column "ban_expires" date;
alter table "sessions" add column "impersonated_by" text;

-- Les comptes existants prennent le rôle par défaut que Better Auth donne aux nouveaux.
-- Aucun administrateur n'est désigné ici : le premier se nomme à la main, par une
-- requête sur la base de l'environnement (docs/setup.md section 7).
UPDATE users SET role = 'user' WHERE role IS NULL;
