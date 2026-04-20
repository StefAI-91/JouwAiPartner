# Micro Sprint PW-QC-01: Security, error handling, routing

> **Parent tranche:** [`PW-QC-index.md`](./PW-QC-index.md) — quality-check follow-up op PW-02.

## Doel

De drie Flowwijs-regels die in PW-02 op `/dev/extractor` en de dev-actions soepel zijn toegepast, alsnog strict maken. Geen functionele wijzigingen, wel defense-in-depth + consistente API-contracten.

## Requirements

| ID          | Beschrijving                                                                                                     |
| ----------- | ---------------------------------------------------------------------------------------------------------------- |
| SEC-QC-001  | `runDevExtractorAction` en `runDevRiskSpecialistAction`: `requireAdminInAction()` staat vóór `safeParse(input)`  |
| SEC-QC-002  | `getMeetingStructurerPromptAction` en `getRiskSpecialistPromptAction`: idem auth-gate vóór andere checks         |
| FUNC-QC-001 | `apps/cockpit/src/app/(dashboard)/dev/extractor/loading.tsx` toegevoegd                                          |
| FUNC-QC-002 | `apps/cockpit/src/app/(dashboard)/dev/extractor/error.tsx` toegevoegd                                            |
| FUNC-QC-003 | Alle 4 dev-extractor Server Actions retourneren discriminated union `{ success: true, data: … } \| { error: … }` |
| FUNC-QC-004 | `client.tsx` consumer aangepast aan de nieuwe shape                                                              |
| QUAL-QC-001 | Test: action retourneert `{ error: "Geen toegang" }` voor unauthenticated caller zelfs bij ongeldige Zod-input   |
| QUAL-QC-002 | Test: action retourneert `{ success: true, data: … }` voor valid admin flow                                      |
| RULE-QC-001 | Geen breaking changes voor andere consumers (er zijn er geen — alleen `/dev/extractor` client)                   |

## Bronverwijzingen

- Review-finding **B1** (auth vóór Zod) — `apps/cockpit/src/actions/dev-extractor.ts:62, :176`.
- Review-finding **E1** (loading/error routes).
- Review-finding **E2** (action-shape inconsistent).
- Flowwijs-regel `CLAUDE.md` → "Security (drie lagen, altijd alle drie)".
- Flowwijs-regel `CLAUDE.md` → "Server Actions retourneren `{ success, data? }` of `{ error }`. Consistent."
- Flowwijs-regel `CLAUDE.md` → "Elke feature-route heeft `loading.tsx` en `error.tsx`."

## Context

### Huidige staat

```ts
// apps/cockpit/src/actions/dev-extractor.ts (pseudo)
export async function runDevExtractorAction(input: unknown) {
  const parsed = runDevExtractorSchema.safeParse(input); // Zod eerst
  if (!parsed.success) return { error: "Ongeldige invoer" };
  const adminCheck = await requireAdminInAction(); // Auth daarna
  if (!adminCheck.ok) return { error: "Geen toegang" };
  // …
  return {
    /* DevExtractorResult */
  }; // niet wrapped
}
```

### Gewenste staat

```ts
export async function runDevExtractorAction(input: unknown) {
  const adminCheck = await requireAdminInAction(); // Auth eerst
  if (!adminCheck.ok) return { error: "Geen toegang" };
  const parsed = runDevExtractorSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };
  // …
  return { success: true, data: result }; // wrapped
}
```

### Waarom auth eerst

Op dit moment lekt de huidige volgorde geen data (Zod faalt vóór DB-calls), maar conventie: defense-in-depth = auth is de buitenste gate. Als er ooit een refactor gebeurt die Zod-gedrag wijzigt naar bijvoorbeeld partial-parse, dan blijft de auth-gate staan.

### Waarom de action-shape

`client.tsx` checkt nu `"error" in res`. Dat werkt, maar alle overige Server Actions in de codebase (zie `apps/cockpit/src/actions/entities.ts`, `apps/cockpit/src/actions/review.ts`) gebruiken `{ success, data } | { error }`. Eén conventie door de hele app verlaagt cognitieve load.

## Werkwijze

1. **Actions aanpassen** — swap de auth/Zod volgorde in de 4 dev-actions. Run `npm run type-check`.
2. **Shape-wrapper** — type `DevExtractorActionResult = { success: true; data: DevExtractorResult } | { error: string }`. Return-statements aanpassen.
3. **Client aanpassen** — `client.tsx` update: `if ("error" in res) …` wordt `if (!res.success) …`. Idem voor prompt-fetch actions.
4. **Route files** — `loading.tsx` = simpele skeleton ("Laden harness…"), `error.tsx` = "use client" + "Er ging iets mis · retry-knop".
5. **Tests** — extra cases in `apps/cockpit/__tests__/actions/dev-extractor.test.ts` voor de beide gedrags-invarianten (auth blokkeert vóór Zod; success-path geeft `{ success: true, data }`).

## Definition of done

- Type-check + lint + tests groen.
- Handmatig: `/dev/extractor` draait zoals voor de wijziging; unauthenticated user krijgt redirect uit middleware, niet via action-error.
- Geen andere files dan de 4 actions + client + 2 route-files + 1 test-file aangepast.
