# Meeting Extraction Strategy

> **Status:** Geïmplementeerd
> **Datum:** 2026-04-05

---

## Kernprincipe

**Summary = primaire intelligence. Alleen action items als losse extracties.**

Decisions, needs, insights en signalen zijn context — ze horen in de samenvatting als narratief. Alleen action items zijn echt actionable en verdienen individuele tracking (review, promotie naar task).

## Waarom deze aanpak

1. **Niet alles wat geëxtraheerd wordt is waar** — een klant noemt 10 wensen, maar 3 zijn echte requirements. Pre-labelen als `need` geeft valse zekerheid.

2. **On-demand analyse is beter** — als je een voorstel wilt maken, geeft je een slim model alle summaries en laat het zelf beoordelen wat echt belangrijk is.

3. **Reviewers hoeven minder te doen** — geen 4 tabs met losse extracties. Summary lezen, action items checken, klaar.

## Wat de summary bevat

De summary is een rijke, gestructureerde samenvatting met duidelijke hiërarchie:

### Briefing
3-5 zinnen als narratief ("Stef had een goed gesprek met Acme Corp over hun AI-plannen...")

### Kernpunten
5-10 punten geordend op belang, met bold labels waar van toepassing:
- **Besluit:** voor genomen besluiten
- **Behoefte:** voor klantbehoeften/wensen
- **Afspraak:** voor concrete afspraken
- **Signaal:** voor observaties, trends
- **Risico:** voor waarschuwingssignalen

Relevante quotes uit het transcript worden inline toegevoegd.

### Deelnemers
Naam, rol, organisatie, houding per deelnemer.

### Vervolgstappen
Concrete next steps als checkboxes: `- [ ] Actie — eigenaar, deadline`

## Wat action items zijn

Concrete taken met:
- `content` — wat moet er gebeuren
- `assignee` — wie is verantwoordelijk
- `deadline` — wanneer
- `scope` — project of persoonlijk
- `project` — gerelateerd project
- `confidence` — hoe zeker is de AI
- `transcript_ref` — exacte quote als bewijs

## Meeting-type focus

De summary en action items worden gestuurd door meeting-type-specifieke instructies:

| Type | Summary focus | Action items focus |
|------|--------------|-------------------|
| Discovery | Klantbehoeften, pijnpunten, budget/timeline | Wat moeten wij/klant uitzoeken |
| Sales | Scope, pricing, beslissers | Offerte, demo, informatie |
| Status update | Voortgang, blokkades, scope-wijzigingen | Blokkade-oplossingen |
| Team sync | Blokkades, prioriteiten | Wie doet wat |
| Strategy | Besluiten, risico's, trade-offs | Strategische acties |
| Kick-off | Scope, rolverdeling, milestones | Setup-taken, eerste deliverables |

## Downstream use cases

De summary is het bronmateriaal. Analyse gebeurt on-demand:

| Use case | Hoe het werkt |
|----------|--------------|
| **Follow-up email** | AI samenvoegt briefing + action items tot email-draft |
| **Voorstel generatie** | AI analyseert alle summaries van een klant, destilleert requirements |
| **PRD generatie** | AI groepeert behoeften uit meerdere summaries per project |
| **Meeting prep** | AI genereert een-pager met openstaande acties en context |

## Regenerate functionaliteit

Bestaande meetings kunnen ge-regenereerd worden met de nieuwe prompt:
- Eén knop: regenereert summary + action items tegelijk
- Oude extracties (decisions, needs, insights) worden verwijderd
- Beschikbaar op zowel review als meeting detail pagina's

## MCP tools

| Tool | Status |
|------|--------|
| `get_meeting_summary` | Primair — rijke summary met alle intelligence |
| `get_action_items` | Alleen action item extracties |
| `get_tasks` | Gepromoveerde taken |
| `search_knowledge` | Zoekt in summaries + action items |
| `get_decisions` | **Verwijderd** — decisions zitten in summary |
| `correct_extraction` | Alleen voor action items |
