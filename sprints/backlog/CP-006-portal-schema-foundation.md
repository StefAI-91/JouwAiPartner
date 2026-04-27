# Micro Sprint CP-006: Portal Schema Foundation

## Doel

Het pure datalagen-fundament leggen voor de v1 client portal: twee nieuwe text-kolommen op `issues`, een `PORTAL_SOURCE_GROUPS`-constant met fallback-helper, en de TypeScript-interfaces in de mutations-laag uitbreiden. Geen UI-werk in deze sprint — na CP-006 kunnen DevHub (CP-007) en portal (CP-008) parallel verder.

## Requirements

| ID           | Beschrijving                                                                                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SCHEMA-V1-01 | Migratie voegt `client_title TEXT NULL` en `client_description TEXT NULL` toe aan `issues` (idempotent)                                                                        |
| SCHEMA-V1-02 | Constant `PORTAL_SOURCE_GROUPS` in `packages/database/src/constants/issues.ts` met groepen `client` (`portal,userback`) en `jaip` (`manual,ai`)                                |
| SCHEMA-V1-03 | Helper `resolvePortalSourceGroup(source: string): 'client' \| 'jaip'` — onbekende sources mappen naar `'jaip'`                                                                 |
| SCHEMA-V1-04 | `InsertIssueData` en `UpdateIssueData` in `packages/database/src/mutations/issues/core.ts` accepteren `client_title?: string \| null` en `client_description?: string \| null` |
| SCHEMA-V1-05 | Geen RLS-wijziging — bestaande `20260418110000_issues_rls_client_hardening.sql` blijft de schrijfregels bewaken                                                                |

## Afhankelijkheden

- CP-001 (database foundation) — `issues`-tabel + RLS
- CP-004 (issue tracker) — bestaande `IssueRow`/`ISSUE_SELECT` definities

## Taken

### 1. Migratie

- Maak `supabase/migrations/<datum>_issues_client_translation_columns.sql`:
  - `ALTER TABLE issues ADD COLUMN IF NOT EXISTS client_title TEXT;`
  - `ALTER TABLE issues ADD COLUMN IF NOT EXISTS client_description TEXT;`
  - Geen DEFAULT, geen NOT NULL — fallback gebeurt in de query/UI-laag
  - Korte comment in de SQL waarom: PRD §6 — fallback naar `title`/`description` als leeg
- Run migratie lokaal en regenereer de Supabase types (zoals andere migraties in deze repo)

### 2. Constants + helper

- `packages/database/src/constants/issues.ts`:

  ```typescript
  export const PORTAL_SOURCE_GROUPS = [
    { key: "client", label: "Onze meldingen", sources: ["portal", "userback"] },
    { key: "jaip", label: "JAIP-meldingen", sources: ["manual", "ai"] },
  ] as const;

  export type PortalSourceGroupKey = (typeof PORTAL_SOURCE_GROUPS)[number]["key"];
  ```

- `resolvePortalSourceGroup(source)`:
  - Loop door `PORTAL_SOURCE_GROUPS`, return de `key` waarvan `sources` de input bevat
  - Onbekende of `null`/`undefined` source → return `'jaip'`
  - Defensief: zorg dat dit een pure functie is (geen DB-call), zodat zowel UI als query-laag hem kan gebruiken

### 3. Mutation-types uitbreiden

- `packages/database/src/mutations/issues/core.ts`:
  - Voeg `client_title?: string | null` en `client_description?: string | null` toe aan zowel `InsertIssueData` als `UpdateIssueData`
  - `insertIssue` en `updateIssue` zelf hoeven geen wijziging — ze spreaden `data` al

### 4. Query-select aanpassen

- `packages/database/src/queries/issues/core.ts`:
  - Voeg `client_title` en `client_description` toe aan `ISSUE_SELECT` zodat de DevHub-editor (CP-007) en portal-queries (CP-008) ze direct krijgen
  - Voeg ze ook toe aan de `IssueRow`-interface
- Verifieer met type-check dat consumers in DevHub niet breken (alle bestaande callers van `IssueRow` mogen `client_title`/`client_description` ongebruikt laten)

## Verificatie

- [ ] Migratie draait idempotent (tweede keer zonder errors)
- [ ] `npm run type-check` slaagt zonder nieuwe `any`s
- [ ] Unit-test of inline test op `resolvePortalSourceGroup`: bekende sources mappen correct, onbekende → `'jaip'`
- [ ] `insertIssue({ project_id, title, client_title: 'foo' })` accepteert het veld zonder TS-error
- [ ] Geen drift in `INTERNAL_STATUS_TO_PORTAL_KEY` of `PORTAL_STATUS_GROUPS` — die waren al correct, deze sprint raakt ze niet
- [ ] DevHub draait nog (geen runtime-regressie op `apps/devhub/src/features/issues/`)

## Bronverwijzingen

- PRD: `docs/specs/prd-client-portal/06-data-model.md` (kolommen + constants)
- PRD: `docs/specs/prd-client-portal/05-functionele-eisen.md` §5.2 (source-mapping + fallback)
- Bestaand patroon: `PORTAL_STATUS_GROUPS` in `packages/database/src/constants/issues.ts:97`
- Mutations-types: `packages/database/src/mutations/issues/core.ts:6-56`
