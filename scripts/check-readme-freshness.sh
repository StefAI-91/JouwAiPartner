#!/usr/bin/env bash
# README-freshness check — verifieert dat elke features/[x]/README.md synchroon
# loopt met de echte bestanden op schijf.
#
# Regel (zie CLAUDE.md § Feature-structuur):
#   Elke feature heeft een README.md met menu per laag. Bij toevoegen van
#   files update je de README. Zonder sync verliest het menu zijn waarde
#   (knowledge drift — zie memory/project_knowledge_drift.md).
#
# Wat dit script checkt per feature:
#   - UNDOCUMENTED: .ts/.tsx files die bestaan maar NIET in README staan
#   - STALE:        filenames die in README staan maar NIET op schijf bestaan
#
# Detectie: alle backtick-wrapped filenames in README met .ts/.tsx extensie
# (bv. `add-project-button.tsx`, `projects.ts`). Paden zonder extensie zoals
# `@repo/database/queries/projects` worden genegeerd.
#
# Uitzonderingen (niet gerapporteerd):
#   - index.ts (barrel, meestal triviaal)
#   - *.test.ts, *.test.tsx (test-files horen niet in een feature-README)
#   - README.md zelf
#
# UNDOCUMENTED telt óók als de PascalCase-export genoemd wordt. Bijvoorbeeld
# `meetings-list.tsx` is OK als de README `MeetingsList` noemt (veelvoorkomend
# patroon in component-tabellen). Alleen écht onvindbare files worden geflagd.
#
# Draait NIET in pre-commit (te luidruchtig als je een file toevoegt vóór je
# documenteert). Handmatig via `npm run check:readmes`.

set -e

# kebab-case → PascalCase (add-project-button → AddProjectButton)
to_pascal() {
  echo "$1" | awk -F- '{for (i=1; i<=NF; i++) $i=toupper(substr($i,1,1)) substr($i,2); print}' OFS=''
}

# kebab-case → camelCase (use-theme-form-state → useThemeFormState)
to_camel() {
  echo "$1" | awk -F- '{printf "%s", $1; for (i=2; i<=NF; i++) printf "%s", toupper(substr($i,1,1)) substr($i,2); print ""}'
}

# kebab-case → UPPER_SNAKE (donut-palette → DONUT_PALETTE)
to_upper_snake() {
  echo "$1" | tr 'a-z-' 'A-Z_'
}

ISSUES_TOTAL=0

# Vind alle feature-directories: apps/[app]/src/features/[naam]/
while IFS= read -r feature_dir; do
  feature_name=$(basename "$feature_dir")
  app_name=$(basename "$(dirname "$(dirname "$feature_dir")")")
  readme="$feature_dir/README.md"

  if [ ! -f "$readme" ]; then
    echo "ONTBREKEND: $app_name/$feature_name heeft geen README.md"
    ISSUES_TOTAL=$((ISSUES_TOTAL + 1))
    continue
  fi

  # Alle .ts/.tsx files in de feature, als basename (excl index.ts en *.test.*)
  files_on_disk=$(find "$feature_dir" -type f \( -name '*.ts' -o -name '*.tsx' \) \
    ! -name 'index.ts' \
    ! -name '*.test.ts' \
    ! -name '*.test.tsx' \
    -exec basename {} \; | sort -u)

  # Alle backtick-wrapped filenames in README met .ts/.tsx extensie
  files_in_readme=$(grep -oE '`[^`]*[a-z][a-z0-9-]*\.tsx?`' "$readme" 2>/dev/null \
    | sed -E 's/^`//; s/`$//; s|.*/||' \
    | sort -u)

  # Volledige README-inhoud voor PascalCase-match fallback
  readme_content=$(cat "$readme")

  feature_issues=0
  feature_output=""

  # UNDOCUMENTED: op schijf maar niet in README (ook niet als PascalCase)
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    if echo "$files_in_readme" | grep -qx "$f"; then
      continue
    fi
    # Fallback: export-naam matches — PascalCase / camelCase / UPPER_SNAKE
    basename_no_ext="${f%.*}"
    pascal=$(to_pascal "$basename_no_ext")
    camel=$(to_camel "$basename_no_ext")
    upper=$(to_upper_snake "$basename_no_ext")
    if echo "$readme_content" | grep -qE "\b(${pascal}|${camel}|${upper})\b"; then
      continue
    fi
    feature_output+="  UNDOCUMENTED: $f (niet in README, ook niet als ${pascal}/${camel}/${upper})"$'\n'
    feature_issues=$((feature_issues + 1))
  done <<< "$files_on_disk"

  # STALE: in README maar niet op schijf (binnen de feature)
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    if ! echo "$files_on_disk" | grep -qx "$f"; then
      feature_output+="  STALE:        $f (in README maar bestaat niet in deze feature)"$'\n'
      feature_issues=$((feature_issues + 1))
    fi
  done <<< "$files_in_readme"

  if [ "$feature_issues" -gt 0 ]; then
    echo ""
    echo "⚠  $app_name/$feature_name ($feature_issues issue(s)):"
    printf "%s" "$feature_output"
    ISSUES_TOTAL=$((ISSUES_TOTAL + feature_issues))
  fi
done < <(find apps/*/src/features -mindepth 1 -maxdepth 1 -type d 2>/dev/null | sort)

if [ "$ISSUES_TOTAL" -eq 0 ]; then
  echo "✓ alle features synchroon met hun README"
  exit 0
fi

echo ""
echo "Totaal: $ISSUES_TOTAL issue(s) over alle features."
echo ""
echo "Fix: update de relevante README.md of verplaats/verwijder de file."
echo "Zie CLAUDE.md § Feature-structuur."
exit 1
