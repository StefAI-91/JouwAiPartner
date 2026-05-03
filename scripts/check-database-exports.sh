#!/usr/bin/env bash
# Drift-check: elke folder-cluster onder packages/database/src/{queries,mutations}/
# moet expliciete `exports`-entries hebben in packages/database/package.json.
#
# Achtergrond (SRP-013 post-mortem): de fallback `"./queries/*": "./src/queries/*.ts"`
# resolveert naar een NIET-bestaand .ts-bestand zodra een god-file wordt
# gesplitst in een folder. Turbopack/dev verbergt de breuk; alleen `tsc --noEmit`
# per app vangt het. Resultaat: stille breuk in productie.
#
# Deze check faalt zodra een nieuwe folder-cluster geen expliciete entries
# heeft. Voor elke folder `<naam>/` met een `index.ts` zoeken we:
#   1. "./queries/<naam>": "./src/queries/<naam>/index.ts"
#   2. "./queries/<naam>/*": "./src/queries/<naam>/*.ts"
#
# Zelfde voor `mutations/`.

set -e

PKG_JSON="packages/database/package.json"

if [ ! -f "$PKG_JSON" ]; then
  echo "FOUT: $PKG_JSON niet gevonden."
  exit 1
fi

VIOLATIONS=()

check_layer() {
  local layer="$1"  # "queries" of "mutations"
  local base="packages/database/src/${layer}"

  if [ ! -d "$base" ]; then return; fi

  for dir in "$base"/*/; do
    [ -d "$dir" ] || continue
    local name
    name=$(basename "$dir")
    local index="${dir}index.ts"
    if [ ! -f "$index" ]; then continue; fi

    local entry_main="\"./${layer}/${name}\": \"./src/${layer}/${name}/index.ts\""
    local entry_glob="\"./${layer}/${name}/*\": \"./src/${layer}/${name}/*.ts\""

    if ! grep -qF "$entry_main" "$PKG_JSON"; then
      VIOLATIONS+=("ontbrekend in package.json exports: ${entry_main}")
    fi
    if ! grep -qF "$entry_glob" "$PKG_JSON"; then
      VIOLATIONS+=("ontbrekend in package.json exports: ${entry_glob}")
    fi
  done
}

check_layer "queries"
check_layer "mutations"

if [ ${#VIOLATIONS[@]} -eq 0 ]; then
  exit 0
fi

echo "FOUT: folder-clusters zonder expliciete package.json exports-entries."
echo ""
echo "De fallback './queries/*' en './mutations/*' resolveren naar .ts-bestanden,"
echo "niet naar folders. Zonder expliciete entries breekt het importpad voor"
echo "Next.js apps die strict module-resolution gebruiken (portal, cockpit)."
echo ""
for v in "${VIOLATIONS[@]}"; do
  echo "  - $v"
done
echo ""
echo "Fix: voeg de twee entries toe in $PKG_JSON in de juiste sectie,"
echo "vóór de fallback-regel (./queries/* of ./mutations/*)."
exit 1
