# Verificatie per substap

Elke substap heeft drie verificatie-lagen. In deze volgorde — niet
overslaan, niet omkeren.

## 1. Type-check

```bash
npx tsc --noEmit -p apps/[app]
```

**Groen = 0 output.** Errors worden direct getoond.

**Wat dit wel vangt:**

- Ontbrekende imports (pad bestaat niet)
- Type-mismatches na refactor
- Ongedefinieerde exports

**Wat dit NIET vangt:**

- Client/server-bundle-lek via barrel files
- Runtime-configuratie problemen
- Next.js routing-specifieke issues

## 2. Productie-build (KRITIEK)

```bash
npm run build --workspace=apps/[app]
```

**Groen = build completes en toont route-lijst.**

**Waarom dit essentieel is:** de build doet tree-shaking, client/server-
bundle-analyse, en Next.js-specifieke checks. Problemen die alleen hier
verschijnen:

### Client/server lek

Symptoom:

```
#4 [Client Component Browser]:
    ./packages/database/src/supabase/server.ts [Client Component Browser]
    ./packages/auth/src/access.ts [Client Component Browser]
    ./apps/[app]/src/features/[f]/components/some-component.tsx
    ./apps/[app]/src/features/[f]/components/index.ts
    ./apps/[app]/src/app/(dashboard)/.../page.tsx

npm error Lifecycle script `build` failed
```

**Oorzaak:** een client component importeert via een barrel (`index.ts`)
die transitief server-only code meeneemt.

**Fix:** verwijder de barrel voor deze laag (meestal `components/`). Laat
consumers direct importeren per specifieke file.

### Route-generation error

Symptoom: één route in de build-output mist, of faalt met een tool error.

**Fix:** check of `app/[feature]/page.tsx` nog klopt. Routes blijven
**altijd** in `app/`, nooit in `features/`.

## 3. Handmatige browser smoke test

Jij kunt niet zelf klikken. Laat de gebruiker dit doen.

**Vraag ze bij themes-achtige migraties:**

- Open de feature-pagina (`/themes`, `/emails`, ...)
- Klik één actie die een mutation triggert (bewerken, archiveren,
  approve, reject)
- Check de dashboard/startpagina — featurepills / widgets renderen
- Check de review-queue — feature-extractions verschijnen

**Rapport bij falen:**

- Exacte URL waar het fout gaat
- Wat ze deden (klik, typen)
- Wat ze zagen (error-bericht, 500, blank screen)
- Browser console output (F12 → Console tab)

## Checklist per substap

Afvinken vóór commit:

- [ ] `tsc --noEmit` → 0 errors
- [ ] `npm run build` → slaagt volledig
- [ ] Grep op oude paden → 0 matches
- [ ] Oude map leeg of weg
- [ ] Handmatige smoke test groen (user-bevestigd)
- [ ] Commit message volgt conventie
- [ ] Commit bevat ALLEEN deze substap (geen drive-by changes)

## Wanneer je terug wilt draaien

Als iets niet werkt en je wilt terug naar de vorige staat:

```bash
# Nog niet gecommit? Stash of reset:
git stash         # behoud changes elders
git restore .     # gooi changes weg (destructief, vraag eerst)

# Al gecommit? Revert (veilig, maakt nieuwe commit):
git revert HEAD

# Of als het zeker fout is en nog niet gepusht:
git reset --hard HEAD~1   # destructief — alleen met user-akkoord
```

**Vraag altijd akkoord voor destructieve operaties.** `git reset --hard`
en `git restore` kunnen werk weggooien.
