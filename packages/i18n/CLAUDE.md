# packages/i18n

`packages/i18n` — **tous les textes affichés**, en anglais (langue par défaut et langue source) et en français, par domaine (`ui`, `game`, `auth`, `account`, `profile`, `admin`, `mail`…). Le dictionnaire français est typé sur la forme de l'anglais : une clé oubliée ne compile pas. Un message paramétré est une fonction, jamais une chaîne à trous. Pur et sans dépendance — le serveur s'en sert pour ses courriers. Voir la section « `locale/` » de `docs/technical/engine.md`.
