#!/usr/bin/env bash
# Q2b — blokkeer directe Supabase .from()-calls in Server Actions en API routes.
#
# Scope (Q2b):
#   - apps/*/src/actions/**
#   - apps/*/src/app/api/**
#
# Niet in scope (Q2c — toekomstige sprint):
#   - Server Components (page.tsx / layout.tsx)
#   - auth-callback route-handlers
#
# Alle data-access hoort via helpers in packages/database/queries of
# packages/database/mutations te lopen. Zie packages/database/README.md voor
# het client-scope beleid (admin- vs user-scoped client).
#
# Allowlist:
#   scripts/supabase-from-allowlist.txt bevat paden die nog directe calls
#   mogen bevatten omdat ze in scope van een latere sub-sprint migreren.
#   Q2b-B en Q2b-C leegen die lijst progressief; wanneer hij leeg is kan het
#   bestand verwijderd worden.

set -e

FORBIDDEN_PATHS=(
  "apps/cockpit/src/actions"
  "apps/cockpit/src/app/api"
  "apps/devhub/src/actions"
  "apps/devhub/src/app/api"
  "apps/portal/src/actions"
  "apps/portal/src/app/api"
)

ALLOWLIST_FILE="scripts/supabase-from-allowlist.txt"

# Lees allowlist-paden in een array (skip lege regels en commentaar).
ALLOWLIST=()
if [ -f "$ALLOWLIST_FILE" ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    trimmed="${line#"${line%%[![:space:]]*}"}"
    trimmed="${trimmed%"${trimmed##*[![:space:]]}"}"
    if [ -z "$trimmed" ] || [[ "$trimmed" == \#* ]]; then
      continue
    fi
    ALLOWLIST+=("$trimmed")
  done < "$ALLOWLIST_FILE"
fi

# Filter de scope-paden die daadwerkelijk bestaan zodat het script ook groen
# loopt op checkouts waar bijvoorbeeld portal nog niet bestaat.
EXISTING_PATHS=()
for path in "${FORBIDDEN_PATHS[@]}"; do
  if [ -d "$path" ]; then
    EXISTING_PATHS+=("$path")
  fi
done

if [ ${#EXISTING_PATHS[@]} -eq 0 ]; then
  exit 0
fi

RAW_HITS=$(rg -n -g '*.ts' -g '*.tsx' -g '!**/__tests__/**' '\.from\("' "${EXISTING_PATHS[@]}" 2>/dev/null || true)

if [ -z "$RAW_HITS" ]; then
  exit 0
fi

# Filter de hits: paden uit de allowlist zijn tijdelijk toegestaan.
FILTERED_HITS=""
while IFS= read -r hit; do
  [ -z "$hit" ] && continue
  hit_path="${hit%%:*}"
  skip=false
  for allowed in "${ALLOWLIST[@]}"; do
    if [ "$hit_path" = "$allowed" ]; then
      skip=true
      break
    fi
  done
  if [ "$skip" = false ]; then
    FILTERED_HITS+="$hit"$'\n'
  fi
done <<< "$RAW_HITS"

# Trim trailing newline.
FILTERED_HITS="${FILTERED_HITS%$'\n'}"

if [ -n "$FILTERED_HITS" ]; then
  echo "FOUT: directe Supabase .from()-calls gevonden buiten packages/database/:"
  echo ""
  echo "$FILTERED_HITS"
  echo ""
  echo "Verplaats de call naar packages/database/queries/ of packages/database/mutations/"
  echo "en importeer de helper in plaats van Supabase direct aan te roepen."
  echo "Zie packages/database/README.md voor het client-scope beleid."
  exit 1
fi

exit 0
