# Micro Sprint TH-013: Rich per-theme summaries uit de Summarizer

## Doel

De Summarizer genereert per identified theme een **rijke**, thema-gefocuste samenvatting — zelfde diepgang als de hoofd-summary (briefing + kernpunten + vervolgstappen), maar gefilterd op wat deze meeting specifiek over dat thema besprak. Die rijke per-thema samenvattingen vervangen het huidige `meeting_themes.summary` — nu gevuld door de Theme-Detector met 1-2 zinnen, geproduceerd vóór de Summarizer draait en op basis van de ruwe Fireflies-summary. Het resultaat: theme detail pages waar elke meeting-kaart een volwaardige thema-narrative toont in plaats van een dunne zin die onderwerp-context meesleept.

**Waarom deze verschuiving.** De Theme-Detector draait in stap 7.5 van de pipeline (`gatekeeper-pipeline.ts:209-231`) met als enige input de ruwe Fireflies-summary. Zijn `theme_summary`-output landt in `meeting_themes.summary` en voedt de theme detail page. In de praktijk komen die summaries hoog-bleed terug: een meeting die voor 30% over thema X gaat krijgt een summary die — ook al is hij volgens spec "thema-scoped" — de hele meeting-context mee-narratieert omdat dat de enige input was. Voor relationele thema's (coaching, leertraject, governance) is dat extra pijnlijk omdat hun substantie inherent verweven is met het onderwerp dat besproken werd. De Summarizer daarentegen heeft de volledige transcript + de rijke meeting-wide kernpunten + `identified_themes` als context (`gatekeeper-pipeline.ts:257`). Hij kán dus per thema een scherpe, rijke samenvatting leveren — hij doet er nu alleen nog niets mee.

**Waarom de bestaande Summarizer uitbreiden i.p.v. een nieuwe agent.** Een dedicated per-theme summarizer zou N aparte LLM-calls vragen (1 per thema), waarbij de dure input (transcript + system prompt) elke keer opnieuw moet. Eén Summarizer-call met N extra output-velden is 3-4× goedkoper bij meetings met meerdere thema's, gebruikt de bestaande pipeline-integratie, en voegt geen nieuwe agent toe aan de registry. Trade-off: multi-output LLM-calls kunnen kwalitatief minder scherp zijn dan gefocuste calls. Strategie: eerst combineren, meten, pas upgraden naar dedicated als de kwaliteit tegenvalt.

**Plus in scope van deze sprint:**

- **Markdown-opslag in `meeting_themes.summary`.** De bestaande text-kolom wordt ruimer gevuld: per thema een markdown-blok met `## Briefing / ## Kernpunten / ## Vervolgstappen`-secties. Geen DB-migratie, geen nieuwe kolommen — bestaande structuur draagt het.
- **UI-rendering als markdown.** `meetings-tab.tsx` rendert de `summary`-kolom nu als platte paragraph (`{m.summary && <p>{m.summary}</p>}`). Wordt een markdown-renderer met dezelfde visuele taal als de meeting-wide rich summary.
- **Theme-Detector's `theme_summary` wordt fallback.** Blijft in het schema + prompt voor backwards compat en als vangnet wanneer de Summarizer faalt of een thema overslaat, maar is niet langer de primaire bron voor de UI.

**Uit scope van deze sprint** (zie Out of scope sectie voor details): extraction-centric UI-refactor, MeetingStructurer reanimatie, NeedsScanner van summary-naar-transcript, Theme-Detector pipeline-volgorde wijzigen.

Eerste tastbare resultaat: je opent `/themes/eges-leertraject`, ziet een meeting-kaart met niet langer _"Stef begeleidt Ege in een technische troubleshooting-sessie rondom het AI confidence-systeem van Fleur op zak..."_ (meeting-wide narrative), maar een rijke thema-gescoped blok met briefing over Stef's coaching-aanpak, kernpunten over de werkwijze die hij Ege aanleerde, en eventuele vervolgstappen rond Ege's ontwikkeling — zonder de onderwerp-context van Fleur te herhalen. Nieuwe meetings krijgen dit direct via de pipeline; backfill van bestaande meetings via `scripts/batch-detect-themes.ts --force`.
