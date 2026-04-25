#!/usr/bin/env bash
# Feature-drift check — blokkeert code die horizontaal wordt geplaatst voor een
# domein dat al een verticale feature-folder heeft.
#
# Regel (zie CLAUDE.md § Feature-structuur):
#   Domeinen met eigen CRUD en eigen flows leven in apps/[app]/src/features/[naam]/.
#   Nieuwe code voor zo'n domein hoort NIET in apps/[app]/src/components/[naam]/
#   of in apps/[app]/src/actions/[naam].ts — dat is drift.
#
# Registry (stand 2026-04-25) — bindend, synchroon houden met CLAUDE.md:
#   cockpit: themes, meetings, emails, projects, review, directory
#   devhub:  issues
#
# `agents` is bewust géén feature: het is een read-only observability-pagina
# zonder eigen actions/validations. Hij leeft als compositiepagina onder
# apps/cockpit/src/components/agents/. Zie CLAUDE.md § Feature-structuur.

set -e

# Format: "app:feature"
FEATURES=(
  "cockpit:themes"
  "cockpit:meetings"
  "cockpit:emails"
  "cockpit:projects"
  "cockpit:review"
  "cockpit:directory"
  "devhub:issues"
)

VIOLATIONS=()

for entry in "${FEATURES[@]}"; do
  app="${entry%%:*}"
  feature="${entry##*:}"

  components_path="apps/${app}/src/components/${feature}"
  actions_path="apps/${app}/src/actions/${feature}.ts"

  if [ -d "$components_path" ]; then
    files=$(find "$components_path" -type f \( -name "*.ts" -o -name "*.tsx" \) 2>/dev/null)
    if [ -n "$files" ]; then
      VIOLATIONS+=("${components_path}/ bestaat — verhuis naar apps/${app}/src/features/${feature}/components/")
    fi
  fi

  if [ -f "$actions_path" ]; then
    VIOLATIONS+=("${actions_path} bestaat — verhuis naar apps/${app}/src/features/${feature}/actions/${feature}.ts")
  fi
done

if [ ${#VIOLATIONS[@]} -eq 0 ]; then
  exit 0
fi

echo "FOUT: feature-drift gedetecteerd — code voor bestaande features hoort in features/[naam]/, niet horizontaal."
echo ""
for v in "${VIOLATIONS[@]}"; do
  echo "  - $v"
done
echo ""
echo "Zie CLAUDE.md § Feature-structuur en .claude/skills/feature-folder-migrate/SKILL.md"
echo "voor het draaiboek. Als dit een nieuwe feature is die NOG geen folder heeft:"
echo "voeg eerst de entry toe aan scripts/check-feature-drift.sh en CLAUDE.md registry."
exit 1
