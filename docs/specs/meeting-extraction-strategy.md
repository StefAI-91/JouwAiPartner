# Meeting Extraction Strategy

> **Status:** Draft — ter bespreking
> **Datum:** 2026-04-05
> **Doel:** Definieer WAT we uit meetings halen, WAAROM, en HOE we het gebruiken

---

## 1. Probleem

De huidige extractie-opzet (4 types: decision, action_item, need, insight) is gebouwd vanuit de vraag "wat zit er in een meeting?" in plaats van "wat willen we ermee doen?". Extracties zijn na review grotendeels "dood" — ze worden opgeslagen en zijn queryable via MCP, maar voeden geen actieve workflows.

**Kernvraag:** Als we weten waarvoor we extracties gaan gebruiken, kunnen we ze veel gerichter en nuttiger maken.

---

## 2. Downstream Use Cases

Dit zijn de concrete dingen die we met meeting-extracties willen doen. Elke use case stelt eisen aan WAT we extraheren.

### 2.1 Voorstel / Offerte genereren

**Scenario:** Na een discovery/sales call wil Stef snel een voorstel maken.

**Wat heb je nodig uit de meeting:**
- Klantbehoeften (wat wil de klant bereiken, pijnpunten)
- Scope-indicaties (wat is er gevraagd, wat is expliciet uitgesloten)
- Budget-signalen (budget genoemd, prijsgevoeligheid, vergelijking met concurrenten)
- Tijdlijn-verwachtingen (wanneer wil de klant live, deadlines)
- Beslissers en stakeholders (wie beslist, wie moet overtuigd worden)
- Technische context (huidige systemen, integraties, constraints)

**Output:** AI genereert een concept-voorstel op basis van deze extracties + eerdere voorstellen als template.

### 2.2 Follow-up email

**Scenario:** Na elke meeting wil je een professionele follow-up sturen.

**Wat heb je nodig uit de meeting:**
- Afspraken (wie doet wat, wanneer)
- Beslissingen (wat is besloten)
- Open punten (wat moet nog uitgezocht worden)
- Volgende stappen (wanneer is het volgende contactmoment)
- Toon/relatie-context (formeel vs informeel, fase van de relatie)

**Output:** AI genereert een gepersonaliseerde follow-up email per meeting.

### 2.3 PRD maken vanuit klantbehoeften

**Scenario:** Na meerdere meetings met een klant wil je behoeften aggregeren tot een PRD.

**Wat heb je nodig uit meetings (cross-meeting):**
- Alle behoeften van deze klant, gegroepeerd per thema
- Prioriteiten (wat noemde de klant het vaakst, wat is urgent)
- Acceptatiecriteria (wanneer is de klant tevreden)
- Randvoorwaarden (budget, tijdlijn, technische constraints)
- Functionele wensen vs nice-to-haves (expliciet onderscheid)

**Output:** AI genereert een PRD-draft op basis van geaggregeerde klantdata.

### 2.4 Client Relationship Management (CRM)

**Scenario:** Voor elk contactmoment wil je weten: wat is de status van deze klant?

**Wat heb je nodig (cross-meeting):**
- Relatiegeschiedenis (eerste contact, fase, sentiment-trend)
- Openstaande toezeggingen (van ons naar klant EN van klant naar ons)
- Risicosignalen (ontevreden, scope creep, betalingsproblemen, concurrentie)
- Kansen (upsell, doorverwijzing, uitbreiding)
- Contactfrequentie en engagement

**Output:** MCP kan per klant een "relationship brief" genereren voor elk volgend gesprek.

### 2.5 Project Health Monitoring

**Scenario:** Bij een status update wil je weten hoe het project ervoor staat.

**Wat heb je nodig uit de meeting:**
- Voortgangsrapportage (wat is af, wat loopt, wat is vertraagd)
- Blokkades (wat staat in de weg)
- Scope-wijzigingen (wat is bijgekomen, wat is geschrapt)
- Klanttevredenheid-signalen (positief/negatief)
- Budget/timeline-status (on track, risico, over)

**Output:** Project health dashboard, automatische alerts bij risico's.

### 2.6 Knowledge Base / Cross-project Learning

**Scenario:** Bij een nieuw project wil je leren van eerdere projecten.

**Wat heb je nodig (cross-project):**
- Lessons learned (wat werkte, wat niet)
- Technische oplossingen (hoe is iets opgelost)
- Schattingen vs realiteit (hoe lang duurde het echt)
- Herbruikbare patronen (aanpak, architectuur, tooling)

**Output:** MCP beantwoordt: "We hebben iets vergelijkbaars gebouwd voor klant X in Y sprints, met deze aanpak."

### 2.7 Team Insight & Coaching

**Scenario:** 1-on-1's en team syncs leveren signalen op over teamdynamiek.

**Wat heb je nodig uit de meeting:**
- Persoonlijke doelen en voortgang
- Blokkades en frustraties
- Werkdruk-signalen
- Feedback (gegeven en ontvangen)
- Groei-observaties

**Output:** Voorbereiding voor volgende 1-on-1, trend-analyse per persoon.

---

## 3. Huidige vs Gewenste Extractietypes

### 3.1 Huidige types (v1)

| Type | Voldoet voor | Mist |
|------|-------------|------|
| `decision` | Basis beslissingen | Geen scope/impact-classificatie, geen link naar vorig besluit |
| `action_item` | Basis taken | Geen onderscheid "van ons" vs "van klant", geen prioriteit |
| `need` | Klantbehoeften | Geen categorisering (functioneel/technisch/business), geen prioriteit vanuit klant |
| `insight` | Breed vangnet | Te vaag — mix van risico's, kansen, feedback, observaties |

### 3.2 Voorgestelde types (v2)

Gebaseerd op de downstream use cases. Elk type heeft een duidelijk **doel** en **downstream gebruik**.

#### `decision` (behouden, verrijkt)

Wat is er besloten?

```
content: string           // Wat is besloten
made_by: string           // Wie heeft het besloten
scope: "project" | "business" | "technical" | "process"
impact: "high" | "medium" | "low"
supersedes: string | null // Vervangt eerder besluit (content ref)
rationale: string | null  // Waarom dit besluit (kort)
```

**Gebruikt door:** Follow-up email, PRD, project health, MCP queries

#### `commitment` (nieuw — vervangt deel van action_item)

Toezegging van een specifiek persoon/partij. Cruciaal voor accountability.

```
content: string           // Wat is toegezegd
owner: string             // Wie heeft het toegezegd
owner_party: "internal" | "client" | "partner"
deadline: string | null   // Wanneer
status: "open" | "fulfilled" | "overdue" | "cancelled"
depends_on: string | null // Waarvan afhankelijk
```

**Gebruikt door:** Follow-up email, CRM (openstaande toezeggingen), project health, task promotie

**Waarom apart van action_item?** Een toezegging is een belofte met accountability. "Wij leveren vrijdag het design" is fundamenteel anders dan "Check even de API docs". Toezeggingen moeten cross-meeting gevolgd worden.

#### `action_item` (behouden, verscherpt)

Concreet to-do item. Kleiner dan een commitment.

```
content: string
assignee: string
deadline: string | null
priority: "high" | "medium" | "low"
project: string | null
```

**Gebruikt door:** Task promotie, follow-up email, project health

#### `requirement` (nieuw — vervangt deel van need)

Concrete klanteis of -wens. Direct bruikbaar voor PRD-generatie.

```
content: string           // Wat wil de klant
category: "functional" | "technical" | "business" | "ux" | "integration"
priority_client: "must_have" | "should_have" | "nice_to_have" | null
source_person: string     // Wie zei dit
project: string | null
acceptance_hint: string | null  // Wanneer is dit "goed genoeg" (als genoemd)
```

**Gebruikt door:** PRD generatie, voorstel/offerte, scope management

#### `risk_signal` (nieuw — uit insight)

Expliciet risico of waarschuwingssignaal.

```
content: string
risk_type: "scope_creep" | "timeline" | "budget" | "satisfaction" | "dependency" | "resource" | "technical"
severity: "high" | "medium" | "low"
related_project: string | null
related_person: string | null
```

**Gebruikt door:** Project health, CRM, alerts, dashboard

#### `opportunity` (nieuw — uit insight)

Kans voor groei, upsell, of verbetering.

```
content: string
opportunity_type: "upsell" | "referral" | "expansion" | "partnership" | "process_improvement"
related_organization: string | null
estimated_value: string | null  // Alleen als expliciet genoemd
```

**Gebruikt door:** CRM, sales pipeline, dashboard

#### `context` (nieuw)

Achtergrondinformatie die geen actie vereist maar cruciaal is voor begrip.

```
content: string
context_type: "technical_landscape" | "stakeholder_info" | "timeline" | "budget" | "competitor" | "constraint"
related_organization: string | null
related_project: string | null
```

**Gebruikt door:** Voorstel generatie, PRD, voorbereiding volgende meeting, MCP queries

#### `feedback` (nieuw — uit insight)

Expliciete feedback over ons werk, proces, of team.

```
content: string
sentiment: "positive" | "neutral" | "negative"
about: "deliverable" | "process" | "communication" | "team_member" | "general"
source_person: string
related_project: string | null
```

**Gebruikt door:** CRM (klanttevredenheid), team coaching, retrospectives

#### `follow_up` (nieuw)

Expliciet benoemd volgend contactmoment of actie.

```
content: string           // Wat is de volgende stap
when: string | null       // Wanneer (datum of "volgende week" etc.)
who: string[]             // Wie zijn erbij betrokken
type: "meeting" | "email" | "deliverable" | "review" | "other"
```

**Gebruikt door:** Follow-up email, agenda planning, CRM

---

## 4. Extractie Lifecycle

### 4.1 Probleem: extracties verouderen

Een besluit van 3 maanden geleden kan inmiddels herzien zijn. Een behoefte kan vervuld of achterhaald zijn. Zonder lifecycle management wordt de knowledge base onbetrouwbaar.

### 4.2 Voorstel: Status per extractie

Elke extractie krijgt een `lifecycle_status`:

| Status | Betekenis | Hoe het verandert |
|--------|-----------|-------------------|
| `active` | Actueel en relevant | Default na review |
| `superseded` | Vervangen door nieuwer item | Automatisch door Curator agent of handmatig |
| `fulfilled` | Volbracht/gerealiseerd | Handmatig of bij task completion |
| `expired` | Niet meer relevant (tijd) | Curator agent detecteert |
| `disputed` | Tegenstrijdig met ander item | Curator agent detecteert |

### 4.3 Cross-meeting linking

Extracties moeten naar elkaar kunnen verwijzen:
- Besluit X **vervangt** besluit Y
- Commitment A **hangt af van** commitment B
- Requirement X **is vervuld door** besluit Y

Dit vereist een `extraction_links` tabel:

```sql
extraction_links
  id UUID PK
  source_extraction_id UUID FK → extractions
  target_extraction_id UUID FK → extractions
  link_type TEXT  -- 'supersedes' | 'depends_on' | 'fulfills' | 'contradicts' | 'relates_to'
  created_at TIMESTAMPTZ
  created_by UUID FK → profiles  -- handmatig of 'system' voor Curator
```

### 4.4 Curator Agent (gepland, v3)

De Curator draait periodiek en:
1. Detecteert **superseded** extracties (nieuwer besluit over zelfde onderwerp)
2. Markeert **expired** items (commitments voorbij deadline zonder update)
3. Flagged **contradictions** (twee actieve extracties die elkaar tegenspreken)
4. Suggereert **merges** (dezelfde requirement uit meerdere meetings)

---

## 5. Downstream Workflows (concrete implementatie)

### 5.1 Follow-up Email Generator

**Trigger:** Na meeting review approval
**Input:** Alle extracties van die meeting
**Template per meeting_type:**

| Meeting type | Email bevat |
|-------------|------------|
| `discovery` | Samenvatting behoeften, voorgestelde vervolgstappen, timeline |
| `sales` | Afspraken, prijsindicatie recap, volgende stappen |
| `status_update` | Voortgang, actiepunten, blokkades, volgende milestone |
| `kick_off` | Scope bevestiging, eerste actiepunten, contactpersonen |

**Technisch:** Server Action + Sonnet die extracties samenvoegt tot email-tekst. Draft in UI, gebruiker past aan en verstuurt.

### 5.2 Voorstel Generator

**Trigger:** Handmatig vanuit klant-pagina
**Input:** Alle `requirement`, `context`, `commitment` extracties van meetings met deze klant
**Extra input:** Eerdere voorstellen (templates), projectgeschiedenis
**Output:** Concept-voorstel met:
- Probleemstelling (uit requirements + context)
- Voorgestelde aanpak (uit knowledge base + templates)
- Scope (must-have vs nice-to-have uit requirements)
- Timeline (uit context + vergelijkbare projecten)
- Prijs (handmatig, maar suggestie op basis van scope)

### 5.3 PRD Generator

**Trigger:** Handmatig vanuit project-pagina
**Input:** Alle `requirement` extracties voor dit project, aangevuld met `decision` en `context`
**Output:** Gestructureerd PRD met:
- User stories (uit requirements)
- Acceptatiecriteria (uit acceptance_hints)
- Technische constraints (uit context)
- Prioritering (uit priority_client)
- Out of scope (uit decisions over uitsluiting)

### 5.4 Meeting Prep Brief

**Trigger:** Automatisch voor elke geplande meeting (of handmatig)
**Input:** Alle actieve extracties voor deze klant/project
**Output:** Een-pager met:
- Relatie-samenvatting (hoe lang klant, fase, sentiment)
- Openstaande commitments (van ons en van hen)
- Risico's (actieve risk_signals)
- Kansen (actieve opportunities)
- Laatste feedback
- Suggesties voor agendapunten

---

## 6. Impact op Bestaande Code

### 6.1 Wat verandert

| Component | Wijziging |
|-----------|----------|
| `extractor.ts` agent prompt | Nieuwe types, metadata-structuur, gerichtere instructies per meeting_type |
| `extractor.ts` Zod schema | Nieuwe types + metadata velden |
| `extractions` tabel | Nieuwe `lifecycle_status` kolom, eventueel metadata-velden |
| Nieuwe tabel: `extraction_links` | Cross-extractie relaties |
| Review UI | Meer types tonen, lifecycle status, linking interface |
| MCP tools | Nieuwe query-mogelijkheden (per klant, per project, per type) |
| Dashboard | Risk signals widget, commitment tracker |

### 6.2 Wat NIET verandert

- Verificatie-model (review gate blijft)
- Database-first architectuur
- Gatekeeper agent (meeting classificatie)
- Bestaande task promotie flow (commitments worden de nieuwe bron)
- MCP server structuur

### 6.3 Migratiestrategie

1. **Database eerst:** Nieuwe kolommen + tabel toevoegen (backward compatible)
2. **Agent updaten:** Nieuwe extractie-types, bestaande meetings hoeven niet opnieuw
3. **Review UI aanpassen:** Nieuwe types tonen en reviewbaar maken
4. **MCP tools uitbreiden:** Nieuwe query-filters
5. **Workflows bouwen:** Follow-up generator, voorstel generator, etc.

---

## 7. Prioritering

### Fase 1: Foundation (sprint 15-16)
- [ ] Extractietypes uitbreiden in schema + agent
- [ ] `lifecycle_status` toevoegen aan extractions tabel
- [ ] Review UI aanpassen voor nieuwe types
- [ ] MCP tools uitbreiden

### Fase 2: Workflows (sprint 17-18)
- [ ] Follow-up email generator
- [ ] Meeting prep brief
- [ ] Commitment tracker in dashboard

### Fase 3: Advanced (sprint 19+)
- [ ] Voorstel generator
- [ ] PRD generator
- [ ] Curator agent voor lifecycle management
- [ ] `extraction_links` tabel + cross-meeting linking
- [ ] Client relationship scoring

---

## 8. Open Vragen

1. **Hoeveel types is te veel?** 9 types is significant meer dan 4. Is de reviewer overhead acceptabel? Alternatief: groepeer in 3 categorieën (decisions, actions, intelligence) met subtypes.

2. **Retroactief?** Moeten bestaande meetings opnieuw door de extractor? Of alleen nieuwe meetings met het nieuwe schema?

3. **Follow-up email: automatisch of handmatig trigger?** Na review approval automatisch een draft maken, of alleen op aanvraag?

4. **Taal:** Extracties zijn nu in het Nederlands. Moeten follow-up emails ook in het Nederlands, of taalafhankelijk van de klant?

5. **Commitment tracking:** Hoe markeren we een commitment als "fulfilled"? Automatisch detecteren uit latere meetings, of handmatig?

---

## 9. Samenvatting

**Van:** 4 brede extractietypes die weinig downstream gebruik hebben
**Naar:** 9 gerichte types die direct voeden in concrete workflows

| Nieuw type | Voornaamste downstream gebruik |
|-----------|-------------------------------|
| `decision` (verrijkt) | Follow-up, PRD, project health |
| `commitment` | CRM, accountability, follow-up |
| `action_item` (verscherpt) | Task promotie, follow-up |
| `requirement` | PRD, voorstel, scope |
| `risk_signal` | Dashboard alerts, project health |
| `opportunity` | Sales pipeline, CRM |
| `context` | Voorstel, PRD, meeting prep |
| `feedback` | CRM, team coaching |
| `follow_up` | Agenda, follow-up email |

De sleutel: **elke extractie moet minstens één concrete workflow voeden**, anders is het data zonder doel.
