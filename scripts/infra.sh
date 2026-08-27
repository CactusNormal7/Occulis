#!/usr/bin/env bash
# Outillage Cloudflare du projet. Enveloppe wrangler pour les opérations courantes,
# et surtout reporte automatiquement les `database_id` dans wrangler.toml : les
# oublier est l'erreur la plus coûteuse de la mise en place (docs/setup.md étape 3).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER="$ROOT/apps/server"
TOML="$SERVER/wrangler.toml"

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
warn() { printf '\033[33m%s\033[0m\n' "$*"; }
fail() { printf '\033[31m%s\033[0m\n' "$*" >&2; }
ok()   { printf '\033[32m%s\033[0m\n' "$*"; }

w() { (cd "$SERVER" && pnpm exec wrangler "$@"); }

# Les bindings ne sont pas hérités par les environnements nommés : toute commande
# visant staging ou production doit porter --env, sinon wrangler ne lit que la
# configuration par défaut et ne voit qu'occulis-local.
env_flag() { [ "$1" = "local" ] && echo "" || echo "--env $1"; }
db_name() {
  case "$1" in
    local)      echo "occulis-local" ;;
    staging)    echo "occulis-staging" ;;
    production) echo "occulis-prod" ;;
  esac
}

choose_env() {
  local prompt="${1:-Environnement}"
  printf '%s :\n  1) local\n  2) staging\n  3) production\n> ' "$prompt" >&2
  local answer; read -r answer
  case "$answer" in
    1) echo "local" ;;
    2) echo "staging" ;;
    3) echo "production" ;;
    *) fail "Choix invalide."; return 1 ;;
  esac
}

# --- Actions -----------------------------------------------------------------

action_status() {
  bold "Compte"
  w whoami || true
  echo
  bold "Bases D1"
  w d1 list || true
  echo
  bold "Configuration"
  check_config
}

check_config() {
  local missing=0
  if grep -q 'REMPLACER_PAR_L_ID' "$TOML"; then
    warn "wrangler.toml contient encore des placeholders :"
    grep -n 'REMPLACER_PAR_L_ID' "$TOML" | sed 's/^/    /'
    warn "→ option 3 pour les remplir automatiquement."
    missing=1
  fi
  if ! grep -q '^\.wrangler/' "$ROOT/.gitignore"; then
    warn ".wrangler/ n'est pas dans .gitignore (état local, ne doit pas être committé)."
    missing=1
  fi
  [ "$missing" -eq 0 ] && ok "Configuration complète."
  return 0
}

action_list() { w d1 list; }

# Crée la base distante si besoin, puis reporte son id dans wrangler.toml.
action_create_dbs() {
  local target; target="$(choose_env 'Base à créer')" || return 0
  if [ "$target" = "local" ]; then
    warn "La base locale n'a pas besoin d'être créée : wrangler dev l'émule dans .wrangler/state."
    return 0
  fi

  local name; name="$(db_name "$target")"
  local id; id="$(db_id_of "$name")"

  if [ -z "$id" ]; then
    bold "Création de $name"
    w d1 create "$name" >/dev/null
    id="$(db_id_of "$name")"
    [ -z "$id" ] && { fail "Création échouée : id introuvable."; return 1; }
    ok "Créée."
  else
    warn "$name existe déjà."
  fi

  patch_toml "$target" "$id"
  ok "wrangler.toml : database_id de $target = $id"
  warn "Pense à committer wrangler.toml — la CI en dépend."
}

db_id_of() {
  # wrangler préfixe sa sortie de bandeaux (proxy, mises à jour) : on repart de la
  # première ligne qui ouvre réellement le tableau JSON, pas du premier crochet venu.
  w d1 list --json 2>/dev/null | node -e '
    let raw = "";
    process.stdin.on("data", (c) => (raw += c));
    process.stdin.on("end", () => {
      const lines = raw.split("\n");
      const start = lines.findIndex((l) => l.trimStart().startsWith("["));
      if (start < 0) return;
      try {
        const parsed = JSON.parse(lines.slice(start).join("\n"));
        const found = parsed.find((d) => d.name === process.argv[1]);
        if (found) process.stdout.write(found.uuid ?? found.database_id ?? "");
      } catch {}
    });
  ' "$1"
}

# Remplace la valeur de database_id dans le bloc [[env.<target>.d1_databases]].
patch_toml() {
  node -e '
    const fs = require("fs");
    const [file, target, id] = process.argv.slice(1);
    const lines = fs.readFileSync(file, "utf8").split("\n");
    const header = `[[env.${target}.d1_databases]]`;
    const start = lines.findIndex((l) => l.trim() === header);
    if (start < 0) throw new Error(`Bloc ${header} introuvable dans ${file}`);
    let patched = false;
    for (let i = start + 1; i < lines.length && !patched; i++) {
      if (lines[i].startsWith("[")) break;
      if (/^\s*database_id\s*=/.test(lines[i])) {
        lines[i] = `database_id = "${id}"`;
        patched = true;
      }
    }
    if (!patched) throw new Error(`database_id introuvable sous ${header}`);
    fs.writeFileSync(file, lines.join("\n"));
  ' "$TOML" "$1" "$2"
}

action_migrate() {
  local target; target="$(choose_env 'Appliquer les migrations sur')" || return 0
  local name; name="$(db_name "$target")"
  if [ "$target" = "local" ]; then
    w d1 migrations apply "$name" --local
  else
    guard_placeholders "$target" || return 1
    w d1 migrations apply "$name" --remote $(env_flag "$target")
  fi
}

# Ne juge que l'environnement visé : un placeholder resté sur prod ne doit pas
# empêcher de travailler sur staging.
configured_id_of() {
  node -e '
    const fs = require("fs");
    const [file, target] = process.argv.slice(1);
    const lines = fs.readFileSync(file, "utf8").split("\n");
    const start = lines.findIndex((l) => l.trim() === `[[env.${target}.d1_databases]]`);
    if (start < 0) process.exit(0);
    for (let i = start + 1; i < lines.length; i++) {
      if (lines[i].startsWith("[")) break;
      const found = lines[i].match(/^\s*database_id\s*=\s*"([^"]*)"/);
      if (found) { process.stdout.write(found[1]); break; }
    }
  ' "$TOML" "$1"
}

guard_placeholders() {
  local id; id="$(configured_id_of "$1")"
  if [ -z "$id" ] || [ "${id#REMPLACER}" != "$id" ]; then
    fail "database_id non renseigné pour '$1' dans wrangler.toml — lance l'option 3 d'abord."
    return 1
  fi
  return 0
}

action_dev() {
  bold "Build du client (le Worker sert ../web/dist)"
  (cd "$ROOT" && pnpm --filter @occulis/web build)
  bold "Migrations locales"
  w d1 migrations apply "$(db_name local)" --local
  bold "Démarrage"
  w dev
}

action_deploy() {
  local target; target="$(choose_env 'Déployer vers')" || return 0
  [ "$target" = "local" ] && { warn "Rien à déployer en local — utilise l'option 5."; return 0; }
  guard_placeholders "$target" || return 1

  bold "Gates"
  (cd "$ROOT" && pnpm typecheck && pnpm lint && pnpm test)
  bold "Build du client"
  (cd "$ROOT" && pnpm --filter @occulis/web build)
  # Migrations avant déploiement : un Worker servi contre un schéma non migré
  # échoue à la première requête.
  bold "Migrations"
  w d1 migrations apply "$(db_name "$target")" --remote $(env_flag "$target")
  bold "Déploiement"
  w deploy $(env_flag "$target")
}

action_sql() {
  local target; target="$(choose_env 'Base à interroger')" || return 0
  printf 'Requête SQL > '
  local query; read -r query
  [ -z "$query" ] && return 0
  local location; [ "$target" = "local" ] && location="--local" || location="--remote"
  w d1 execute "$(db_name "$target")" $location $(env_flag "$target") --command "$query"
}

action_info() {
  local target; target="$(choose_env 'Base à décrire')" || return 0
  w d1 info "$(db_name "$target")" $(env_flag "$target")
}

action_tail() {
  local target; target="$(choose_env 'Logs de')" || return 0
  [ "$target" = "local" ] && { warn "Les logs locaux s'affichent dans wrangler dev."; return 0; }
  w tail $(env_flag "$target")
}

action_deployments() {
  local target; target="$(choose_env 'Déploiements de')" || return 0
  [ "$target" = "local" ] && { warn "Pas de déploiement en local."; return 0; }
  w deployments list $(env_flag "$target")
}

# --- Menu --------------------------------------------------------------------

run() {
  "$@" || fail "Opération interrompue (voir le message ci-dessus)."
}

menu() {
  cat <<'MENU'

  Occulis — infrastructure

   1) Statut (compte, bases, config)
   2) Lister les bases D1
   3) Créer une base distante et remplir wrangler.toml
   4) Appliquer les migrations
   5) Lancer le serveur en local
   6) Déployer (gates + migrations + deploy)
   7) Exécuter une requête SQL
   8) Décrire une base (taille, id, URL)
   9) Logs en direct
  10) Historique des déploiements
   0) Quitter

MENU
  printf '> '
}

main() {
  command -v pnpm >/dev/null || { fail "pnpm introuvable."; exit 1; }
  while true; do
    menu
    local choice; read -r choice || exit 0
    echo
    case "$choice" in
      1) run action_status ;;
      2) run action_list ;;
      3) run action_create_dbs ;;
      4) run action_migrate ;;
      5) run action_dev ;;
      6) run action_deploy ;;
      7) run action_sql ;;
      8) run action_info ;;
      9) run action_tail ;;
      10) run action_deployments ;;
      0|q) exit 0 ;;
      *) fail "Choix invalide." ;;
    esac
  done
}

main "$@"
