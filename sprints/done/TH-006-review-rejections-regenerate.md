# Micro Sprint TH-006: Review-flow + match rejections + regenerate-knop

## Doel

De review-flow compleet maken: nieuwe `emerging` themes verschijnen in `/review` als approval-kaarten (goedkeuren / afwijzen / samenvoegen-placeholder), verkeerde matches kunnen via ⊘-icon worden afgewezen met reden (die landt in `theme_match_rejections`), en Stef/Wouter kunnen vanuit `/meetings/[id]` een meeting handmatig opnieuw laten taggen via de bestaande regenerate-knop. Na deze sprint: de feedback-loop is compleet — matching wordt scherper per week omdat rejections in de volgende ThemeTagger-calls als `negative_examples` meegaan.

## Requirements

| ID       | Beschrijving                                                                                                                                                |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI-290   | Sectie _"Thema's om te bevestigen"_ op `/review` index, boven meetings-queue                                                                                |
| UI-291   | Per emerging theme: approval-card met emoji + name + description (inline editable) + matching_guide textarea                                                |
| UI-292   | Card toont _"Gevonden in:"_ lijst met 2-3 meetings waar het is voorgesteld + evidence-quote                                                                 |
| UI-293   | Drie knoppen: Goedkeuren (primary) / Samenvoegen met… (v2, placeholder-tooltip) / Afwijzen                                                                  |
| UI-294   | Goedkeuren: zet `status='verified'`, `verified_at=now()`, `verified_by=userId`                                                                              |
| UI-295   | Afwijzen: zet `status='archived'` + optioneel reason-veld                                                                                                   |
| UI-296   | Emoji-picker in approval-card: zelfde `emoji-picker-popover` als in TH-005                                                                                  |
| UI-297   | ⊘-icon bij elke theme-link in `/review/[id]` en op theme-detail page meetings-tab                                                                           |
| UI-298   | Klik ⊘ → popover met 3 radio-buttons: `niet_substantieel` / `ander_thema` / `te_breed` + bevestig                                                           |
| UI-299   | Match rejection effect: verwijdert `meeting_themes` row, insert `theme_match_rejections`, herbereken counts                                                 |
| UI-300   | Regenerate-knop op `/meetings/[id]` krijgt extra optie _"Thema's opnieuw taggen"_                                                                           |
| UI-301   | Regenerate is alleen zichtbaar voor Stef/Wouter (zelfde whitelist)                                                                                          |
| FUNC-240 | Query `listEmergingThemes(client)` met voorgestelde meetings + evidence-quotes                                                                              |
| FUNC-241 | Server Action `approveThemeAction(themeId, patch)` met whitelist + Zod                                                                                      |
| FUNC-242 | Server Action `rejectEmergingThemeAction(themeId, reason)` met whitelist                                                                                    |
| FUNC-243 | Server Action `rejectThemeMatchAction(meetingId, themeId, reason)` — split naar mutation + recount                                                          |
| FUNC-244 | Server Action `regenerateMeetingThemesAction(meetingId)` — whitelist-check, wist `meeting_themes` voor meeting, runt ThemeTagger opnieuw, herbereken counts |
| FUNC-245 | `regenerateMeetingThemesAction` bewaart `theme_match_rejections` (wist ze NIET)                                                                             |
| FUNC-246 | Mutation `rejectThemeMatch(meetingId, themeId, reason, userId)` in `mutations/meeting-themes.ts`                                                            |
| FUNC-247 | `listVerifiedThemes` uitgebreid met join op laatste 2-3 `theme_match_rejections` per thema voor gebruik als `negative_examples`                             |
| SEC-210  | Alle 4 Server Actions checken whitelist (Stef/Wouter) en faalen met `{error:'forbidden'}` voor anderen                                                      |
| EDGE-210 | Regenerate op meeting zonder extractions → geen error, gewoon leeg resultaat                                                                                |
| EDGE-211 | Rejection op een match die intussen al verwijderd is → idempotent geen error                                                                                |

## Bronverwijzingen

- PRD: `docs/specs/prd-themes.md` → §10 review-flow (regels 613-678)
- PRD: `docs/specs/prd-themes.md` → §5.5 feedback-loop met rejections
- PRD: `docs/specs/prd-themes.md` → §12 handmatig regenerate via meeting-detail
- Prototype: `theme-lab/variants/section-a.tsx` + `section-c.tsx` voor emoji-picker
- Repo: `apps/cockpit/src/app/(dashboard)/review/` — bestaande review-flow
- Repo: `apps/cockpit/src/app/(dashboard)/meetings/[id]/` — bestaande regenerate-knop

## Context

### Bestandsstructuur

```
apps/cockpit/src/app/(dashboard)/review/
├── page.tsx                          -- UPDATE: sectie themes bovenaan
└── components/
    ├── emerging-themes-section.tsx   -- NEW: lijst approval-cards
    └── theme-approval-card.tsx       -- NEW

apps/cockpit/src/components/themes/
├── match-reject-popover.tsx          -- NEW: ⊘-icon + 3 radios
└── emoji-picker-popover.tsx          -- SHARED (uit TH-005)

apps/cockpit/src/app/(dashboard)/meetings/[id]/
└── regenerate-menu.tsx               -- UPDATE: extra optie "Thema's opnieuw taggen"

apps/cockpit/src/actions/themes.ts    -- UPDATE: 4 nieuwe Server Actions

packages/database/src/mutations/meeting-themes.ts
└── rejectThemeMatch, deleteMatchesForMeeting  -- NEW helpers
```

### Feedback-loop integratie

TH-003 leverde `listVerifiedThemes` zonder negative_examples. Deze sprint breidt uit: query joint `theme_match_rejections` op `theme_id`, pakt laatste 2-3 ordered by `rejected_at DESC`, en vult `negativeExamples[]` op elk thema. Zo zien volgende ThemeTagger-calls de meest recente afwijzingen.

### Regenerate-flow

```
Klik "Thema's opnieuw taggen" op /meetings/[id]
  → Server Action regenerateMeetingThemesAction(meetingId)
      → whitelist-check
      → deleteMatchesForMeeting(meetingId)  [behoudt rejections!]
      → tagMeetingThemes({meeting, themes: listVerifiedThemes(includeNegativeExamples=true), ...})
      → linkMeetingToThemes(meetingId, result.matches)
      → recalculateThemeStats(touchedThemeIds)
      → revalidatePath('/meetings/[id]')
```

### Approval-kaart UX

Inline-editable velden: name (input), description (input), matching_guide (textarea 3 rijen). Submit-knop "Goedkeuren" stuurt patched versie naar `approveThemeAction`. Emoji wisselen via popover.

## Deliverables

- [ ] `emerging-themes-section.tsx` + `theme-approval-card.tsx`
- [ ] `match-reject-popover.tsx`
- [ ] Uitbreiding `meetings/[id]/regenerate-menu.tsx` met themes-optie
- [ ] `actions/themes.ts` met 4 nieuwe actions + whitelist-helper (gedeeld met TH-005)
- [ ] `mutations/meeting-themes.ts` uitbreiding met `rejectThemeMatch`, `deleteMatchesForMeeting`
- [ ] `queries/themes.ts` — `listVerifiedThemes` krijgt `includeNegativeExamples: boolean` parameter
- [ ] `queries/themes.ts` — nieuwe `listEmergingThemes()`

## Acceptance criteria

- Na emerging theme proposal: verschijnt op `/review` in themes-sectie.
- Goedkeuren → thema krijgt status='verified' en verschijnt volgende refresh op dashboard pills.
- Afwijzen → status='archived'; dashboard onaangeroerd.
- Klik ⊘ bij match + kies 'ander_thema' + bevestig → match weg, rejection gelogd, mention_count klopt.
- Na regenerate op een meeting: oude matches verdwenen, nieuwe matches verschijnen, rejections ongemoeid.
- Volgende ThemeTagger-run op dezelfde meeting gebruikt negative_examples in zijn prompt (check via `scripts/try-theme-tagger.ts` log).
- Non-whitelist users zien geen regenerate-knop en krijgen `{error:'forbidden'}` bij direct invocation.

## Handmatige test-stappen

1. Laat pipeline een emerging theme proposen (of creëer er handmatig een via mutation).
2. `/review` → themes-sectie bovenaan, kaart zichtbaar.
3. Wijzig name + matching_guide inline, klik Goedkeuren → redirect + dashboard heeft nieuwe pill.
4. Open een meeting-detail → klik ⊘ bij één theme-link → kies reden → match verdwijnt.
5. Open `/meetings/[id]` → klik regenerate → kies "Thema's opnieuw taggen" → verschijnen nieuwe matches.
6. `SELECT * FROM theme_match_rejections` → afgewezen matches zichtbaar.
7. Tweede regenerate op zelfde meeting: ThemeTagger prompt zou negative_examples-paragraaf moeten tonen (check logs).

## Out of scope

- Samenvoegen van themes (v2, Curator-agent).
- Contradiction detection (v2/v3).
- Weekly digest email (v3).
- Candidate-pool / theme_candidates-tabel (v1.5, alleen als review te ruisig).
- Notification / badge voor nieuwe emerging themes — later als nodig.
