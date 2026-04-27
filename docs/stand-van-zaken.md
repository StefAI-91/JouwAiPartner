# Stand van zaken — Action Item Specialist tuning

**Branch:** `claude/open-stand-van-zaken-docs-Rjd8f`
**Laatste commit:** `74e4c35` (TIJDELIJK Fireflies-first in dev/action_item flow)
**Status:** in tuning + speaker-mapping subsysteem in productie. Action-item-specialist nog niet productie-klaar — vier prompts + drie filter-lagen + harness met validator-toggle, deterministische follow_up_date resolver, en nu een named-transcript pipeline die anonieme `[speaker_X]`-labels uit ElevenLabs vervangt door deelnemer-namen.

## Doel

De Action Item Specialist haalt action_items uit meeting-transcripten van JouwAIPartner (JAIP). Eindresultaat: deelnemers krijgen na elke meeting een mail met een hoog overzicht van actiepunten — wat zij JAIP nog moeten leveren én wat JAIP hen nog moet leveren. Precision en recall beide kritisch: liever niets dan ruis, maar geen echte action_items missen.

## Architectuur — drie filter-lagen

Iedere accept moet door drie poorten:

1. **Extractor (Sonnet 4.6 high-effort)** — kiest items uit transcript en classificeert ze. Vier prompt-versies parallel beschikbaar; v5 is de scherpste.
2. **Mechanische gate (code)** — checkt drie verplichte velden voor type C/D: `recipient_per_quote = stef_wouter`, `jaip_followup_quote` niet leeg, `jaip_followup_action = productive`. Items die hier vallen worden automatisch gerejecteerd met expliciete reason.
3. **Stage 3 — Action Validator (Haiku, adversarieel)** — voor élk type C/D-item dat de gate haalt: één extra Haiku-call die alleen oordeelt of `jaip_followup_action: productive` klopt. Streng ingesteld, default consumptive bij twijfel. Bij verdict consumptive → item gerejecteerd met `validator-override:` reason.

De validator vangt rationalisatie door de extractor: zelfs als het model `productive` invult voor een feitelijk consumptief vervolg ("ik kom langs"), corrigeert de Haiku-validator dat omdat hij smal getuned is op één vraag.

## Follow-up datum — drie lagen, deterministisch

Naast `deadline` (wanneer iets af moet) extraheren we per item een `follow_up_date` (wanneer wij pingen of opvolgen). Resolver in `packages/ai/src/agents/action-item-follow-up.ts`:

1. **Deadline gevuld** → deterministisch:
   - type A → `deadline` (op de dag zelf checken)
   - type B/C/D → `deadline − 1 werkdag` (één dag van tevoren porren)
   - **Floor:** als resultaat ≤ meetingdatum, bumpt naar `deadline + 1 werkdag` (same-day deadlines: dag erna checken of het gebeurd is)
2. **Deadline leeg, AI-cue gevuld** → AI-waarde gebruiken (alleen als die expliciet in transcript staat: _"binnen twee weken op terug"_, _"stuur me eind volgende maand reminder"_)
3. **Beide leeg + type C** → fallback `meetingdatum + 5 werkdagen` (`TYPE_C_FALLBACK_WORKDAYS`, één consultancy-werkweek). Type A/B/D blijven null — daar heeft JAIP eigen agency en hoeft het systeem geen default op te leggen.

19 unit-tests in `__tests__/agents/action-item-follow-up.test.ts` (werkdag-rekenkunde + alle paden).

## Prompts

| Versie | Stijl                                                                                                                                                  | Lengte      | Wanneer                          |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- | -------------------------------- |
| **v2** | Vier-eis-model met regels + contrast-paren                                                                                                             | 344 regels  | Productie default (bestaand)     |
| **v3** | Drie-vragen-model + gate-velden + voorbeelden                                                                                                          | ~280 regels | Aangescherpt rule-based          |
| **v4** | Voorbeeld-zwaar (~22 voorbeelden) + minimaal kader                                                                                                     | ~280 regels | Voorbeeld-driven                 |
| **v5** | v4 + sales-nuance + A12 lead-vervolg + E23 helper-rol + E24 wekelijkse uitnodiging + A13 ping-cue + JAIP-profielen + speaker-id-regel + follow_up_date | ~360 regels | Nieuwste, voortdurend bijgewerkt |

Alle prompts gebruiken dezelfde gate-velden in het schema. Stef tunet primair v5; v4 staat als vergelijkingsbaseline.

**v5 bevat sinds laatste update extra:**

- **E23 — JAIP-helper-rol in andermans project** (rol-omkering): externe werkt aan eigen project, JAIP zegt "ik help mee" → geen wachtende deliverable → géén type C. Vangt de Chloë-FAQ-rationalisatie. Toets: reasoning die begint met "JAIP helpt [naam] met X" = rode vlag.
- **E24 — Wekelijkse / terugkerende agenda-uitnodiging**: combineert E5 (routine) + E20 (uitnodiging) in één concrete quote-vorm. Vangt de Stefan-Roevros-case waar same-day uitnodigen voor een wekelijkse meeting toch werd geëxtraheerd.
- **A13 — Type C met ping-cue zonder leverdatum** (`follow_up_date`-laan): klant zegt _"ik kom er binnen twee weken op terug"_ zonder leverdatum → `deadline` leeg, `follow_up_date` gevuld. Illustreert het verschil tussen deadline en pingdatum.
- **JAIP-personen herkennings-profielen**: korte profielen voor Wouter (consultant/eigenaar, klantbehoefte, project-leiding) en Stef (technisch partner, hoe systemen werken, architectuur). Tie-breaker bij twijfel: technische how → Stef, klant-richting → Wouter. Niet absoluut.
- **Speaker-identificatie regel**: bij anonieme `[speaker_X]`-labels (ElevenLabs zonder naam-mapping) match aan de Deelnemers-lijst. Lijst krijgt nu rich format: `Stef Banninga (JAIP — internal, CEO)`. Geen `speaker_0` of verzonnen namen in `follow_up_contact`/`assignee`. Bij twijfel confidence ≤ 0.5 of item weglaten.
- **`follow_up_date` regel**: alleen invullen als `deadline` leeg én aparte ping-cue benoemd; anders leeg laten zodat de resolver het deterministisch doet.

## Modes

- **single** — één extractor-call (v2/v3/v4/v5)
- **two-stage** — Spotter (Haiku) + Judge (Sonnet); judge gebruikt eigen `action_item_judge.md` prompt
- **spotter-only** — alleen Haiku-spotter zonder judge (debug-mode)

## Schema

`packages/ai/src/validations/action-item-specialist.ts` heeft naast de bestaande velden drie gate-velden voor élk item:

- `recipient_per_quote: "stef_wouter" | "third_party" | "own_sphere" | "from_jaip" | "unclear"`
- `jaip_followup_quote: string` — letterlijk citaat met Stef/Wouter als actor, of leeg
- `jaip_followup_action: "productive" | "consumptive" | "n/a"`

Plus de opvolg-velden:

- `deadline: string` (ISO YYYY-MM-DD, leeg = onbekend)
- `follow_up_date: string` — alleen door AI in te vullen als `deadline` leeg én er een aparte ping-cue in transcript staat. Bij gevulde deadline laat AI dit leeg en leidt code het deterministisch af.

`packages/ai/src/validations/action-item-action-validator.ts` — schema voor stage 3 validator (verdict + reason).

`packages/ai/src/validations/action-item-two-stage.ts` — splitting in `accepts` + `rejects` arrays voor judge-output.

`packages/ai/src/validations/speaker-identifier.ts` — output-schema voor speaker-mapping (`{ speaker_id, person_name, confidence, reasoning }[]`).

`type_werk = A | B | C | D` (E is verwijderd; migratie `20260425120000_drop_type_werk_e.sql`).

## Speaker-mapping subsysteem (productie)

ElevenLabs Scribe v2 levert betere transcriptie-kwaliteit dan Fireflies maar geeft anonieme `[speaker_0]:`-labels in plaats van namen. Fireflies-attributie blijkt onbetrouwbaar (vaak alle utterances naar de organizer). Oplossing: een Haiku-call die per `speaker_X` een naam toewijst op basis van content-clues, plus een named-transcript-cache in de DB.

**Componenten:**

- **Agent** (`packages/ai/src/agents/speaker-identifier.ts`) — Haiku 4.5 + prompt-cache. Input: representatieve sample-utterances per `speaker_X` uit ElevenLabs (default 10) + per Fireflies-named speaker (cross-reference, ook als attributie incompleet is) + DB-deelnemers met name/role/organization/organization_type. Output: JSON-mapping per speaker_id met confidence + reasoning. Code raakt het transcript zelf nooit; alleen de labels worden vervangen via `applyMappingToTranscript`.
- **Sampling** (`speaker-identifier-sampling.ts`) — `parseElevenLabsUtterances` (regex `[speaker_X]:`), `parseFirefliesUtterances` (heuristiek voor naam-prefix met support voor Nederlandse tussenvoegsels van/de/den/der/te/ter, initialen en O'Brien-style namen, plus header-blacklist Note/Action/Decision), `sampleUtterancesPerSpeaker` + `sampleUtterancesPerName` — langste eerst, filter < 40 chars, fallback als alles kort.
- **Prompt** (`packages/ai/prompts/speaker_identifier.md`) — kruisverwijzen-strategie (anker-zinnen over taalgrenzen heen), redeneer-op-content regels, JAIP-profielen, anti-hallucinatie. **Many-to-one expliciet toegestaan**: 9 ElevenLabs-labels bij 5 echte deelnemers is normaal door diarization-splits (mic-volume, kuchen, korte interrupties).
- **Pipeline-stap** (`packages/ai/src/pipeline/steps/speaker-mapping.ts`) — niet-blokkerend, draait na `runTranscribeStep` in de gatekeeper-pipeline. Returnt het named-transcript zodat de Summarizer er direct mee verder kan zonder DB-roundtrip.
- **DB-cache** — kolom `meetings.transcript_elevenlabs_named` (migratie `20260427120000_meeting_named_transcript.sql`). Rebuildable uit `transcript_elevenlabs`; bij prompt-update gewoon backfillen. Lezers hanteren **named > elevenlabs > fireflies** in productie-pipeline + meeting-transcript-panel + reprocess.
- **Backfill** — twee paden: CLI-script `npx tsx packages/ai/src/scripts/backfill-named-transcripts.ts` (`--dry-run`, `--limit`, `--force`) voor grote runs, en een **UI-panel** op `/dev/speaker-mapping` met live status (counts), batch-limit knob, force-checkbox en cumulatieve resultaat-lijst per meeting (✓ full / ◐ partial / — no_speakers / ✗ error).
- **Test-pagina** `/dev/speaker-mapping` — meeting-picker, knob voor samples per speaker, drie panelen voor de mapping (per speaker_id, gegroepeerd per persoon, ElevenLabs- en Fireflies-samples) plus raw user-message + system prompt collapsibles.

**Tijdelijke caveat:** in `dev/action_item` flow (action-item harness + golden-coder UI) is `getMeetingForGoldenCoder` weer Fireflies-first geflipt omdat de mapping nog niet betrouwbaar genoeg is voor letterlijke source-quote-validatie tegen golden. Productie-pipeline blijft named-first.

## Harness

`/dev/action-items/run` (cockpit, admin-only). UI heeft:

- **Prompt-dropdown** (v2 / v3 / v4 / v5) — alleen actief in single mode
- **Mode-dropdown** (single / two-stage / spotter-only)
- **Validator-checkbox** — stage 3 aan/uit voor vergelijking met/zonder
- **Confidence ≥** en **Match-similarity ≥** filter-knobs

Result-panels:

- Precision/Recall/F1 vs golden dataset
- Per-item diff: match (groen), false positive (amber), false negative (rood)
- **GatedPanel** (single-call) — items die door auto-gate of validator zijn afgewezen, met visueel onderscheid tussen auto-gate (amber) en validator-override (purple). Toont source_quote, jaip_followup_quote, action-classificatie, reden + validator-uitleg.
- **TwoStagePanel** — candidates list met pattern_type + accept/reject status. Reject-rendering kleurcodeert per type (model-reject = rose, auto-gate = amber, validator-override = purple).

## Reeks aanpassingen deze sessie

Iteratief de Robert/Tibor/WhatsApp/Pisma rationalisatie-cases dichtgemaakt:

1. V2-criteria aangescherpt op JAIP-relevantie (commit `bc845cd`)
2. Grounding-eis voor JAIP-vervolgstap (passief = leeg) (`c6ec25e`)
3. Mechanische gate met `recipient_per_quote` + `jaip_followup_quote` (`34feea8`)
4. Collectief ≠ stef_wouter, passief = leeg citaat (`dde263d`)
5. Externen onderling niet extraheren (`25d43a3`)
6. Anti-rationalisatie-toets bij externen-onderling (`432ae68`)
7. `jaip_followup_action` enum (productive/consumptive) + gate (`d91b02f`)
8. Same-day + agenda-uitnodiging niet extraheren (`e4ff83e`)
9. v4 voorbeeld-zware prompt (`fc534f9`)
10. Stage 3 action-validator (Haiku, adversarial) (`7c3ac03`)
11. Validator: consultatief gesprek = productive (recall fix) (`9b7755c` / `8b13c67`)
12. UI zichtbaarheid: GatedPanel + kleurcodes
13. Actief boven passief regel voor jaip_followup_quote (`51ea1e1`)
14. Modaal+tijdsanker = toezegging (v4 only) (`79c7cd8`)
15. v5 prompt — v4 + sales-nuance + lead-vervolg-voorbeeld (`e20577a`)
16. `follow_up_date` veld + deterministische resolver (`c9410b4`)
17. v5 — E23 helper-rol + E24 wekelijkse uitnodiging (`29deaf0`)
18. Type-C fallback-opvolging (5 werkdagen) + A13 voorbeeld (`a93b0fb`)
19. ElevenLabs als default + verrijkte participants uit DB (`39ced7b`)
20. Flat `meetings.participants` als fallback bij golden-query (`e4e4b4f`)
21. Speaker-mapping test-pagina (`45582dd`)
22. Fireflies-cross-reference in speaker-mapping (`8f786a5`)
23. Many-to-one diarization-splits in speaker-mapping prompt + UI grouped view (`6b7ee23`)
24. JAIP-personen herkennings-profielen in speaker-identifier (`4422d20`)
25. Speaker-mapping productie-integratie (named-cache, pipeline-stap, backfill-script) (`817d937`)
26. Backfill-panel op `/dev/speaker-mapping` (`6ac9d57`)
27. TIJDELIJK Fireflies-first in dev/action_item flow (`74e4c35`)

## Lessons learned

- **Anthropic strict-mode** is allergisch voor `.int().min(1)` constraints. Gebruik `z.number()` en post-clamp.
- **High-effort thinking + structured output** cap je response. Bij parse-failures: drop high-effort eerst, dan bump maxOutputTokens.
- **Tijdsankers zijn geen condities** ("in week van 4 mei" = deadline, niet voorwaardelijk).
- **Tibor en Dion** behandelen als gewone externen werkt beter dan een aparte type E.
- **Prompt-tuning heeft een asymptoot.** Modellen rationaliseren rond regels door hun eigen velden zo in te vullen dat ze technisch valide lijken. Mechanische code-checks helpen, maar pas met een aparte adversariële validator-call krijg je echte druk op de classificatie.
- **Voorbeelden boven regels.** Sinds v4 plakken we nieuwe edge cases als voorbeelden in een groeiend `## VOORBEELDEN` blok ipv abstracte regels te stapelen. Stef kan dit zelf onderhouden — geen prompt-engineering meer.
- **Validator moet zowel filteren als doorlaten.** Eerste versie was te streng (mistte consultancy-werk dat productive ís). Verfijnd met expliciet onderscheid: inhoudelijke rol (advies geven) = productive, toehoorder-rol (langskomen) = consumptive.
- **Modaal werkwoord + concrete tijdsanker = toezegging.** "Ik zal je dat kunnen delen in week van X" is geen wens, het is een commitment met datum. Zonder tijdsanker = wens.
- **Cold sales vs lead-vervolg** zijn verschillende dingen. Cold contact (eerste mail/call) = buiten scope. Vervolgactie op bestaande lead (meeting inplannen, voorstel sturen) = wel trackbaar.
- **Deadline ≠ opvolgdatum.** Voor type C willen we vaak één werkdag eerder pingen dan de levering; voor type B/D net zo. Deterministische resolver met floor (>meeting) is voorspelbaar en testbaar — AI laten gokken op pingdatum opent een nieuwe rationalisatie-route zonder ground truth.
- **Diarization is geen 1-op-1 mapping.** ElevenLabs splitst dezelfde persoon over meerdere `speaker_X`-labels bij wisselend mic-volume of korte interrupties. Many-to-one moet expliciet toegestaan zijn in de speaker-mapping-prompt; "één persoon per speaker"-regel was averechts.
- **Fireflies attributie is een hint, geen waarheid.** Vaak alle utterances naar de organizer geplakt zonder echte diarization. Wel bruikbaar als cross-reference voor speaker-mapping (anker-zinnen overlappen content-wise zelfs over taalgrenzen heen).
- **Letterlijkheid versus kwaliteit is een tradeoff.** ElevenLabs heeft hogere transcriptie-kwaliteit maar de named-versie kan kleine drift introduceren. Voor agents die op letterlijke `source_quote` matchen tegen golden (action-item-specialist) is Fireflies-first momenteel veiliger; voor agents die abstraheren (Summarizer, RiskSpecialist) is named-first beter.
- **Code voor mapping, AI voor inhoud.** Speaker-mapping is pure timestamp/content-overlap — daar is code beter in dan een merge-LLM die paraphraseert. Haiku doet alleen de mapping (klein output), code doet de label-rewrite (text-integriteit gegarandeerd).

## Bekende problemen

- **Spotter (two-stage)** is traag op grote meetings (~4 min). Single-call met v5 is sneller en even goed; two-stage blijft als experiment.
- **Speaker-mapping kwaliteit varieert** per meeting. Bij meetings met weinig anker-zinnen of meerdere externen die op elkaar lijken qua rol komt Haiku met partial mappings. Vandaar de tijdelijke Fireflies-first-revert in dev/action_item — letterlijke source-quote-matching tegen golden was te onbetrouwbaar.

## Open vragen

- Welke prompt is best op de golden dataset: v2 / v3 / v4 / v5? Geen vergelijkings-data per cohort.
- Is two-stage waardevol genoeg vs single-call? Niet gevalideerd.
- Is stage 3 validator aan vs uit netto winst (precision-winst > recall-verlies)? Te meten in harness.
- Welke combinatie wordt productie? (Voorlopige aanname: single-call + v5 + validator aan.)
- Wanneer is speaker-mapping goed genoeg om óók in dev/action_item flow named-first te zetten? Vereist evaluatie van backfill-resultaten over een grotere batch + eventueel verdere prompt-tuning.
- Helpen de JAIP-profielen in de speaker-mapping prompt voldoende, of moeten we meer deelnemers (Tibor, Dion, vaste klanten) toevoegen?

## Volgende stap

1. **Golden-set draaien** met v3, v4, v5 (single-call) + validator aan/uit voor elk → precision/recall/F1 per cohort.
2. **Productie-default kiezen** op basis van die data.
3. Eventueel **two-stage parkeren** als single-call+v5+validator vergelijkbaar of beter scoort.
4. **Speaker-mapping backfill** stapsgewijs draaien via `/dev/speaker-mapping` UI (eerst limit 3, dan 10, dan rest). Per meeting beoordelen of de mapping overtuigend is voordat we 'm op productie als named-first laten lopen.
5. **Dev/action_item flow terug naar named-first** zodra speaker-mapping-kwaliteit goed genoeg is (één regel flippen in `getMeetingForGoldenCoder`).

## Belangrijke files

```
packages/ai/prompts/
  action_item_specialist.md             # v2, productie default
  action_item_specialist_v3.md          # v3, drie-vragen + gate-velden
  action_item_specialist_v4.md          # v4, voorbeeld-zwaar
  action_item_specialist_v5.md          # v5, v4 + sales-nuance + E23/E24/A13 + JAIP-profielen
  action_item_candidate_spotter.md      # two-stage stage 1 (Haiku)
  action_item_judge.md                  # two-stage stage 2 (Sonnet) + gate-velden
  action_item_action_validator.md       # stage 3 (Haiku, adversarial)
  speaker_identifier.md                 # speaker-mapping (Haiku) — kruisverwijzen + JAIP-profielen

packages/ai/src/agents/
  action-item-specialist.ts
    - runActionItemSpecialist           # single-call (v2/v3/v4/v5) + gate + validator
    - runActionItemCandidateSpotter     # standalone stage 1
    - runActionItemSpecialistTwoStage   # spotter + judge + gate + validator
    - validateFollowupAction            # stage 3 Haiku-validator
    - checkActionItemGate               # mechanische check
    - extractTranscriptContext          # ±1500 chars rond quote voor validator
    - applyFollowUpResolver             # resolver wire-up per item
  action-item-follow-up.ts
    - resolveFollowUpDate               # deterministische ping-datum
    - addWorkdays                       # werkdag-rekenkunde (skip weekend)
    - TYPE_C_FALLBACK_WORKDAYS = 5
  speaker-identifier.ts
    - runSpeakerIdentifier              # Haiku-mapping speaker_X → naam
    - applyMappingToTranscript          # rewrite [speaker_X]: → [naam]:
    - SPEAKER_MAPPING_APPLY_THRESHOLD = 0.6
  speaker-identifier-sampling.ts
    - parseElevenLabsUtterances + parseFirefliesUtterances
    - sampleUtterancesPerSpeaker + sampleUtterancesPerName

packages/ai/src/validations/
  action-item-specialist.ts             # single-call schema + 3 gate-velden + follow_up_date
  action-item-two-stage.ts              # candidate + judgement schemas
  action-item-action-validator.ts       # validator-output schema
  speaker-identifier.ts                 # speaker-mapping output schema

packages/ai/src/pipeline/steps/
  speaker-mapping.ts                    # niet-blokkerende pipeline-stap, returnt named_transcript

packages/ai/src/scripts/
  backfill-named-transcripts.ts         # CLI-backfill (--dry-run, --limit, --force)

packages/database/src/queries/golden.ts
  # getMeetingForGoldenCoder — TIJDELIJK Fireflies-first voor dev/action_item

packages/database/src/queries/meetings/core.ts
  - getSpeakerMappingTranscriptCounts
  - countSpeakerMappingBackfillRemaining
  - listSpeakerMappingBackfillCandidates
  - getMeetingParticipantsForSpeakerMapping

apps/cockpit/src/actions/dev-action-item-runner.ts
  # harness runner: prompt-versie, mode, validator-toggle

apps/cockpit/src/actions/dev-speaker-mapping.ts
  # speaker-mapping test + backfill-batch action

apps/cockpit/src/app/(dashboard)/dev/action-items/run/client.tsx
  # harness UI: dropdowns + GatedPanel + TwoStagePanel + diff-view (deadline + opvolgdatum)

apps/cockpit/src/app/(dashboard)/dev/speaker-mapping/{page,client}.tsx
  # speaker-mapping test-pagina + backfill-panel met live status

supabase/migrations/
  20260425120000_drop_type_werk_e.sql
  20260427120000_meeting_named_transcript.sql      # transcript_elevenlabs_named cache-kolom
```

## Productie-status

**Action-item-specialist:** nog niet productie-klaar. v2 single-call blijft de default voor de gatekeeper-pipeline. Pas mergen na golden-set validatie van v5 + validator versus de huidige v2.

**Speaker-mapping subsysteem:** wél productie-actief — nieuwe meetings krijgen automatisch een named-transcript via de pipeline-stap (niet-blokkerend). Migratie `20260427120000_meeting_named_transcript.sql` moet zijn gedraaid. Bestaande meetings worden via `/dev/speaker-mapping` UI of het CLI-script ge-backfilled. Lezers in de gatekeeper-pipeline + meeting-transcript-panel + reprocess-route hanteren `named ?? elevenlabs ?? fireflies`. Action-item harness + golden-coder UI staan tijdelijk Fireflies-first.

**Follow-up resolver:** in productie binnen de action-item-specialist runners (single + two-stage). Items krijgen automatisch een opvolgdatum bij gevulde deadline; type C zonder cue krijgt fallback `meetingdatum + 5 werkdagen`.
