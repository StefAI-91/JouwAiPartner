# Offboarding Checklist per Traject

**Datum:** 2026-03-30
**Doel:** Structurele procedure bij beeindiging van een klanttraject (Wouter punt 6)

---

## Wanneer uitvoeren

- Bij formele beeindiging van een klanttraject
- Bij opzeggen van een overeenkomst
- Bij einde van een pilot/proefperiode

---

## Checklist

### 1. Toegang intrekken

- [ ] Team-toegang tot klantomgevingen verwijderen (Moneybird, Gmail, agenda's, etc.)
- [ ] Klant-specifieke API keys deactiveren of roteren
- [ ] Klant-accounts in het platform deactiveren (Supabase Auth)
- [ ] Gedeelde wachtwoorden/tokens roteren
- [ ] MCP server toegang voor klant-specifieke tools intrekken

### 2. Data verwijderen

- [ ] Meetings van de klant identificeren (via `organization_id` in meetings tabel)
- [ ] Gerelateerde extracties verwijderen (decisions, action_items, needs, insights)
- [ ] Meeting-participants en meeting-projects koppelingen verwijderen
- [ ] Meeting records verwijderen
- [ ] Klant-organisatie record verwijderen of markeren als inactive
- [ ] Klant-contactpersonen verwijderen uit people tabel
- [ ] Klant-projecten verwijderen of markeren als completed/cancelled
- [ ] Embeddings die klantdata bevatten zijn automatisch mee verwijderd (CASCADE)
- [ ] Verifieer dat `raw_fireflies` JSONB data ook is verwijderd (zit in meetings)

### 3. Externe koppelingen

- [ ] Fireflies: stop met verwerken van meetings met klant-deelnemers
- [ ] Controleer of er geen scheduled jobs meer draaien voor deze klant
- [ ] Verwijder klant-specifieke webhook configuraties (indien aanwezig)

### 4. Documentatie

- [ ] Datamapping bijwerken (klant verwijderen uit actieve integraties)
- [ ] Toegangsbeheer log bijwerken
- [ ] Bevestigingsmail naar klant sturen dat data is verwijderd

### 5. Verificatie

- [ ] Zoek in de database op organisation_id — verwacht 0 resultaten
- [ ] Zoek in de kennisbank op klantnaam — verwacht 0 resultaten
- [ ] Check MCP tools op klantnaam — verwacht 0 resultaten

---

## SQL template voor data verwijdering

> **Let op:** Voer dit uit met de admin client. Maak eerst een backup.

```sql
-- Stap 1: Identificeer de organisatie
SELECT id, name FROM organizations WHERE name ILIKE '%[klantnaam]%';

-- Stap 2: Identificeer alle meetings
SELECT id, title, date FROM meetings WHERE organization_id = '[org_id]';

-- Stap 3: Verwijder extracties (CASCADE vanuit meetings zou dit moeten doen)
DELETE FROM extractions WHERE organization_id = '[org_id]';

-- Stap 4: Verwijder meeting koppelingen
DELETE FROM meeting_participants WHERE meeting_id IN (
  SELECT id FROM meetings WHERE organization_id = '[org_id]'
);
DELETE FROM meeting_projects WHERE meeting_id IN (
  SELECT id FROM meetings WHERE organization_id = '[org_id]'
);

-- Stap 5: Verwijder meetings
DELETE FROM meetings WHERE organization_id = '[org_id]';

-- Stap 6: Verwijder projecten
DELETE FROM projects WHERE organization_id = '[org_id]';

-- Stap 7: Verwijder klant-contactpersonen (handmatig selecteren)
-- LET OP: controleer of deze personen niet ook bij andere organisaties horen
-- DELETE FROM people WHERE id IN ('[person_id_1]', '[person_id_2]');

-- Stap 8: Verwijder of deactiveer organisatie
UPDATE organizations SET status = 'inactive' WHERE id = '[org_id]';
-- Of volledig verwijderen:
-- DELETE FROM organizations WHERE id = '[org_id]';
```

---

## Bevestigingsmail template

> Beste [naam],
>
> Hierbij bevestigen wij dat het traject [projectnaam] per [datum] is beeindigd.
>
> De volgende acties zijn uitgevoerd:
>
> - Alle toegang tot jullie omgevingen is ingetrokken
> - Alle meeting-transcripts, extracties en gerelateerde data zijn verwijderd uit ons platform
> - API-koppelingen zijn gedeactiveerd
>
> Mochten er nog vragen zijn, neem gerust contact op.
>
> Met vriendelijke groet,
> [naam]
> JouwAiPartner

---

## Toekomstige verbeteringen

- **Automatisch offboarding script:** SQL template omzetten naar een Server Action die via het dashboard kan worden uitgevoerd
- **Soft-delete:** `deleted_at` kolom toevoegen zodat data eerst gearchiveerd wordt voor het definitief verwijderd wordt (30 dagen retentie)
- **Audit trail:** Loggen wie de offboarding heeft uitgevoerd en wanneer
