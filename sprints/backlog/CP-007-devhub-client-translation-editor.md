# Micro Sprint CP-007: DevHub Client-Translation Editor

## Doel

JAIP-team in staat stellen om in de DevHub issue-editor optionele klant-vriendelijke titels en beschrijvingen (`client_title`, `client_description`) op te slaan. Deze velden worden via fallback in de portal getoond. Na deze sprint kan het team op CAI-issues hertalingen invullen die straks zichtbaar worden in CP-008.

## Requirements

| ID            | Beschrijving                                                                                                                                                |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DH-EDIT-V1-01 | DevHub issue-editor toont twee tekstvelden: "Klant-titel" (optioneel) en "Klant-beschrijving" (optioneel, textarea/markdown)                                |
| DH-EDIT-V1-02 | `updateIssue`-action in DevHub accepteert en persisteert de twee velden zonder breaking change op bestaande velden                                          |
| DH-EDIT-V1-03 | Zod-validatie schema voor de issue-editor accepteert `client_title?: string` en `client_description?: string` (geen min-length)                             |
| DH-EDIT-V1-04 | Velden hebben subtiele hint-tekst die uitlegt waar ze worden gebruikt ("Wordt getoond aan klanten in de portal; leeg = oorspronkelijke titel/beschrijving") |
| DH-EDIT-V1-05 | Eerste invulling: JAIP-team vult op 3-5 bestaande CAI-issues hertalingen in om CP-008 mee te valideren (data-task, geen code)                               |

## Afhankelijkheden

- **CP-006** (schema foundation) — kolommen, types en `ISSUE_SELECT` moeten klaar zijn
- CP-004 (issue tracker basis) — bestaande DevHub editor in `apps/devhub/src/features/issues/`

## Taken

### 1. Validatie-schema uitbreiden

- Vind het bestaande Zod-schema dat `apps/devhub/src/features/issues/actions/issues.ts` gebruikt (waarschijnlijk in `packages/database/src/validations/` of in DevHub zelf)
- Voeg toe:
  - `client_title: z.string().max(200).optional().nullable()`
  - `client_description: z.string().max(5000).optional().nullable()`
- Lege strings normaliseren naar `null` (om "leeg = fallback" eenduidig te houden)

### 2. UI: tekstvelden in editor

- Bekijk eerst `apps/devhub/src/features/issues/components/{issue-form.tsx, sidebar-fields.tsx}` om te bepalen waar de velden het beste landen — vermoedelijk een eigen sectie "Klant-vertaling (optioneel)" onder de hoofdvelden
- Voeg twee velden toe:
  - `Input` voor `client_title` — placeholder "Optioneel — wordt getoond aan de klant"
  - `Textarea` voor `client_description` — same hint, ~6 regels hoog
- Hint-tekst onder de sectie: "Leeg laten = de klant ziet de oorspronkelijke titel/beschrijving"
- Gebruik bestaande `Input`/`Textarea`/`Label`-primitives uit `@repo/ui`

### 3. Server action

- `apps/devhub/src/features/issues/actions/issues.ts`:
  - `updateIssue`-action accepteert `client_title` + `client_description` in z'n input
  - Geef ze door aan `updateIssue` uit `@repo/database/mutations/issues` (interface al uitgebreid in CP-006)
  - `revalidatePath` op DevHub issue-detail én op `/projects/[id]/issues` in portal indien mogelijk (anders wacht op natuurlijke revalidatie)

### 4. Optioneel: AI-hertaling-knop placeholder

- **Niet bouwen** — staat in PRD §4 als "uitgesteld naar v2 (aparte spec)"
- Wel: ruimte vrijhouden in de UI-sectie voor een toekomstige "Genereer hertaling met AI"-knop, zonder hem te tonen

### 5. Eerste invulling op CAI-issues

- Stef + 1 reviewer kiezen 3-5 bestaande CAI-issues uit met technisch jargon
- Vullen handmatig `client_title` en `client_description` in via de nieuwe editor
- Doel: levende testset voor CP-008 zodat het 4-bucket dashboard direct iets om te tonen heeft

## Verificatie

- [ ] DevHub issue-detail toont twee nieuwe lege velden bij een nieuwe issue
- [ ] Invullen + opslaan persisteert beide waarden naar de DB (`select client_title, client_description from issues where id=...`)
- [ ] Bestaande issues zonder ingevulde waarden tonen lege velden, niet `null` als string
- [ ] Issue zonder hertaling werkt onveranderd (geen regressie op DevHub flow)
- [ ] Zod-validatie laat lege string toe (niet verplicht)
- [ ] 3+ CAI-issues hebben hertalingen klaar voor CP-008 verificatie
- [ ] Type-check slaagt; lint slaagt

## Bronverwijzingen

- PRD: `docs/specs/prd-client-portal/03-doelgroep-gebruikers.md` §3.3 (rechten)
- PRD: `docs/specs/prd-client-portal/05-functionele-eisen.md` §5.3 (fallback-logica)
- PRD: `docs/specs/prd-client-portal/06-data-model.md` (schrijfregels)
- Bestaand: `apps/devhub/src/features/issues/components/issue-form.tsx` + `sidebar-fields.tsx`
- Bestaand: `apps/devhub/src/features/issues/actions/issues.ts`
