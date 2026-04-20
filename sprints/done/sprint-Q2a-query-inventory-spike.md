# Sprint Q2a — Query Inventory (Spike)

**Type:** Spike — alleen onderzoek, geen code-wijzigingen
**Duur:** 1-2 uur
**Area:** hele codebase — alle plekken waar Supabase direct aangeroepen wordt
**Priority:** Blokkeert Q2b
**Aanleiding:** Review van het eerste Q2-voorstel toonde aan dat de "13 `.from()` calls" een onderschatting was: werkelijk aantal ligt rond 58+ (28 in actions, 4 in API routes, 26 in Server Components/pages). Voor er code verplaatst wordt, moet de volledige lijst vaststaan.

## Doel

Produceer `docs/specs/query-inventory.md`: compleet overzicht van alle directe Supabase-calls buiten `packages/database/`, gecategoriseerd, met client-type en doel. Plus een beslissingsdocument over client-scope-beleid en tooling.

## Taken

### Q2a-1: Volledige grep-inventaris

- [ ] Grep `.from(` in alle `apps/*/src/**/*.{ts,tsx}` (exclusief `__tests__/`)
- [ ] Grep `createClient(`, `getAdminClient(`, `getServerClient(` op dezelfde locaties
- [ ] Lijst per bestand met regelnummer en gebruikte tabel

### Q2a-2: Categorisering

Categoriseer elke call per:

- [ ] **Locatie-type:** Server Action / Route Handler (`app/api/`) / Server Component (`page.tsx`/`layout.tsx`) / Client Component
- [ ] **Doel-tabel:** welke Supabase-tabel
- [ ] **Operatie:** read (`select`) / write (`insert`, `update`, `upsert`, `delete`)
- [ ] **Client-scope:** admin / user-scoped / onbekend

### Q2a-3: Bestaande helpers in kaart

- [ ] Lijst alle functies in `packages/database/src/queries/*.ts`
- [ ] Lijst alle functies in `packages/database/src/mutations/*.ts`
- [ ] Matrix: welke directe call overlapt met een bestaande helper (kan hergebruik) vs welke vereist nieuwe helper

### Q2a-4: Transactie-audit

Voor bestanden met 3+ sequentiële calls (bijv. `meeting-pipeline.ts`):

- [ ] Lees de flow: is er een atomiciteits-aanname die breekt als calls apart worden?
- [ ] Documenteer: Supabase JS client heeft geen client-side transactie-API. Kan de flow een `.rpc()` worden die server-side atomair is?
- [ ] Markeer flows die echt een RPC of service-role-procedure nodig hebben

### Q2a-5: Client-scope beleid

- [ ] Inventariseer bestaande patronen: wanneer admin, wanneer server-client
- [ ] Bepaal in rapport: welk beleid geldt voor nieuwe helpers in `packages/database/mutations/`? Default admin? Expliciet doorgeven?
- [ ] Schrijf één alinea beleid dat in `packages/database/README.md` (Q4b) komt

### Q2a-6: Lint/check tooling

Bepaal concrete implementatie:

- [ ] Optie 1: custom ESLint-regel (check huidige `eslint.config.mjs` structuur, welke plugin-mogelijkheden)
- [ ] Optie 2: bash `scripts/check-no-direct-supabase.sh` in CI / pre-commit
- [ ] Optie 3: Grep-only in Husky pre-commit
- [ ] Kies één optie, documenteer waarom

### Q2a-7: Parse-helpers-inventaris

- [ ] `parseDirection`, `parseFilterStatus` in `apps/cockpit/src/app/(dashboard)/emails/page.tsx:21-27`
- [ ] Grep naar soortgelijke parser-patronen in andere route-bestanden (meetings, projects, issues)
- [ ] Bepaal scope: alleen emails, of algemener

### Q2a-8: Scope-vraag definitief beantwoorden

- [ ] Zijn API routes in scope voor Q2b? (Argumenten per kant)
- [ ] Zijn Server Components in scope? (Argumenten per kant)
- [ ] Zo niet: aparte sprint Q2c / Q2d nodig?

## Output

**Bestand:** `docs/specs/query-inventory.md` met:

1. Volledige tabel (locatie-type, pad:regel, tabel, operatie, client-scope)
2. Hergebruik-matrix
3. Transactie-analyse per flow
4. Beleid client-scope (één alinea)
5. Keuze lint/check tooling (met redenen)
6. Scope-beslissingen

## Afronding

- [ ] Rapport gecommit
- [ ] Q2b taaklijst kan gebaseerd worden op deze inventaris
- [ ] Getal "N directe calls" staat vast; Q2b opent niet meer ter discussie
