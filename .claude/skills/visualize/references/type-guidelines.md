# Richtlijnen per type visualisatie

Elke type visualisatie heeft eigen patronen en verwachtingen. Volg deze richtlijnen bij het bouwen.

## 🧩 Component

Doel: laat zien hoe één UI-element eruitziet in al zijn states.

- Toon het component in **meerdere states naast elkaar**: default, loading, empty, error, filled
- Gebruik een **grid layout** zodat alle states tegelijk zichtbaar zijn
- Zet **labels boven elke state**: "Default", "Loading", "Empty state", "Error", "Met data"
- Maak interactieve elementen werkend (hover, klik, focus states)
- Gebruik **realistische dummy data** — geen "Lorem ipsum" maar echte namen, emails, bedragen, datums

**Voorbeeld layout:**

```
┌─────────────┬─────────────┬─────────────┐
│   Default   │   Loading   │  Empty state │
│             │   ···       │  Geen data   │
├─────────────┼─────────────┼──────────────┤
│   Error     │  Met data   │              │
│  ⚠ Fout     │  Jan, Piet  │              │
└─────────────┴─────────────┴──────────────┘
```

## 📄 Pagina / Feature

Doel: laat zien hoe een compleet scherm eruitziet met echte data.

- Toon de **volledige pagina** inclusief navigatie en layout
- Gebruik een **realistische viewport** (vraag: desktop of mobile?)
- Vul met **dummy data** die de echte use case nabootst
- Maak navigatie-elementen klikbaar (tabs, sidebar items)
- Toon breadcrumbs of pagina-titel zodat duidelijk is waar je bent
- Voeg **annotaties** toe als HTML comments: `<!-- COMPONENT: LeadsTable -->`

**Checklist:**

- [ ] Header/navigatie aanwezig
- [ ] Sidebar (als relevant voor de app)
- [ ] Hoofdcontent met realistische data
- [ ] Lege en gevulde states overwogen
- [ ] Acties (knoppen, links) zichtbaar en logisch geplaatst

## 🔀 Flow / Proces

Doel: maak zichtbaar welk pad een gebruiker doorloopt, inclusief aftakkingen.

- Toon elke stap als een **kaart** in een horizontale of verticale flow
- Verbind stappen met **pijlen** (CSS borders/pseudo-elements of inline SVG)
- Markeer **beslismomenten** met een ruitvorm of een andere kleur
- Maak stappen **klikbaar** om het bijbehorende scherm te tonen (optioneel)
- Toon het **hoofdpad als highlighted** en alternatieve paden als dimmed
- Voeg een **legenda** toe: stap, beslissing, einde, foutpad

**Visueel patroon:**

```
[Start] → [Stap 1] → ◇ Beslissing ◇ → [Stap 2a] → [Einde ✓]
                           ↓
                      [Stap 2b] → [Fout ✗]
```

**Kleurcodering:**

- Stap: `primary-500` (of grijs bij lo-fi)
- Beslissing: `amber-500`
- Succes/einde: `green-500`
- Fout/afwijzing: `red-500`

## 📊 Datamodel

Doel: visualiseer tabellen, kolommen en relaties als een ER-diagram.

- Toon tabellen als **kaarten** met kolomnamen en types
- Verbind relaties met **lijnen** (SVG of CSS positioned elements)
- Markeer **primary keys** (🔑) en **foreign keys** (🔗)
- **Kleurcodeer** tabeltypen:
  - Kerntabellen: `primary-500` border
  - Junction/koppeltabellen: `amber-500` border
  - Referentie/lookup tabellen: `gray-400` border
- Toon **RLS indicatoren** als er row-level security policies beschreven zijn
- Gebruik een **nette grid layout** — positioneer tabellen zodat relatielijnen zo min mogelijk kruisen

**Kolom weergave:**

```
┌─ users ──────────────────┐
│ 🔑 id          uuid      │
│    name        text      │
│    email       text      │
│    role        enum      │
│    created_at  timestamp │
└──────────────────────────┘
```

## 🏗️ Architectuur

Doel: laat zien hoe systemen en componenten met elkaar communiceren.

- Toon systemen als **blokken met labels**
- **Groepeer per laag**: frontend, backend/API, database, externe services
- Verbind met **pijlen** die het protocol tonen (REST, WebSocket, SQL, webhook)
- **Kleurcodeer**:
  - Intern/eigen systemen: `primary-500`
  - Externe services: `blue-500`
  - Database: `purple-500`
  - Queue/async: `amber-500`
- Toon de **richting van data flow** met pijlpunten
- Gebruik **horizontale lagen** van boven naar beneden: User → Frontend → API → Database

**Voorbeeld layout:**

```
         ┌─ Browser ─┐
              ↓ HTTPS
         ┌─ Next.js ─┐
         ↓ SQL    ↓ REST
    ┌─Supabase─┐ ┌─Resend─┐
```

## 🔄 State diagram

Doel: maak zichtbaar welke toestanden een object kan hebben en hoe het tussen toestanden beweegt.

- Toon states als **rounded rectangles**
- Verbind met **pijlen** die de actie/trigger tonen als label
- Markeer de **start-state** (dubbele border of markering) en **eind-states**
- **Kleurcodeer**:
  - Actief/in progress: `primary-500`
  - Wachtend/pending: `amber-500`
  - Fout/afgewezen: `red-500`
  - Afgerond/compleet: `green-500`
  - Geannuleerd/inactief: `gray-400`
- Toon **welke rol** de transitie mag uitvoeren (als label bij de pijl)
- Maak **interactief** als nuttig: klik op een state om te zien welke transities mogelijk zijn

**Voorbeeld:**

```
[● Concept] --submit (auteur)--> [In review]
[In review] --approve (admin)--> [Goedgekeurd ✓]
[In review] --reject (admin)---> [Afgekeurd ✗]
[Afgekeurd] --revise (auteur)--> [Concept]
```
