# Security Action Plan

**Datum:** 2026-03-30
**Eigenaar technisch:** Stef Banninga
**Eigenaar commercieel/contractueel:** Wouter van den Heuvel

---

## Fase 1: Nu fixen (voor volgende deployment)

| #   | Issue   | Actie                                                   | Eigenaar | Effort |
| --- | ------- | ------------------------------------------------------- | -------- | ------ |
| 1.1 | SEC-001 | Auth toevoegen op `/api/search`, `/api/ask`, `/api/mcp` | Stef     | ~2 uur |
| 1.2 | SEC-003 | CRON_SECRET verplicht maken (niet optioneel)            | Stef     | 15 min |
| 1.3 | SEC-005 | Security headers in `next.config.ts`                    | Stef     | 15 min |
| 1.4 | SEC-011 | Timing-safe webhook signature check                     | Stef     | 15 min |
| 1.5 | SEC-010 | Generieke login foutmeldingen                           | Stef     | 15 min |
| 1.6 | SEC-015 | Test endpoints NODE_ENV whitelist                       | Stef     | 15 min |
| 1.7 | SEC-017 | Orphaned query functies verwijderen                     | Stef     | 15 min |

**Geschatte doorlooptijd:** 1 werkdag

---

## Fase 2: Deze sprint (security baseline compleet)

| #   | Issue   | Actie                                                | Eigenaar | Effort |
| --- | ------- | ---------------------------------------------------- | -------- | ------ |
| 2.1 | SEC-002 | Auth + user context in MCP tools                     | Stef     | ~4 uur |
| 2.2 | SEC-004 | Server client gebruiken voor reguliere queries       | Stef     | ~4 uur |
| 2.3 | SEC-006 | Rate limiting op API endpoints                       | Stef     | ~2 uur |
| 2.4 | SEC-007 | CORS configuratie toevoegen                          | Stef     | 30 min |
| 2.5 | SEC-009 | Audit logging framework (wie vraagt wat op, wanneer) | Stef     | ~4 uur |
| 2.6 | SEC-012 | Secret scanning in pre-commit hook (gitleaks)        | Stef     | 30 min |
| 2.7 | —       | Standaard contractparagraaf dataverwerking           | Wouter   | ~4 uur |
| 2.8 | —       | Toolbeleid: goedgekeurde tools lijst documenteren    | Stef     | 1 uur  |

**Geschatte doorlooptijd:** 1 sprint (1-2 weken)

---

## Fase 3: Volgende sprint (hardening)

| #   | Issue   | Actie                                       | Eigenaar | Effort |
| --- | ------- | ------------------------------------------- | -------- | ------ |
| 3.1 | SEC-008 | RLS policies op alle tabellen               | Stef     | ~8 uur |
| 3.2 | SEC-014 | Data retentiebeleid + soft-delete kolommen  | Stef     | ~4 uur |
| 3.3 | SEC-013 | Dependabot/Snyk inschakelen op GitHub       | Stef     | 30 min |
| 3.4 | SEC-016 | Structured logging (vervangt console.error) | Stef     | ~4 uur |
| 3.5 | —       | Offboarding script per organisatie          | Stef     | ~4 uur |
| 3.6 | —       | Periodieke key rotatie inrichten            | Stef     | ~2 uur |

**Geschatte doorlooptijd:** 1 sprint (1-2 weken)

---

## Fase 4: Continu (lopend)

| Actie                                             | Frequentie      | Eigenaar    |
| ------------------------------------------------- | --------------- | ----------- |
| npm audit draaien                                 | Wekelijks       | Stef        |
| Credentials rotatie                               | Elke 90 dagen   | Stef        |
| Security audit herhalen                           | Per kwartaal    | Stef        |
| Datamapping updaten bij nieuwe integratie         | Bij wijziging   | Stef        |
| Incident protocol reviewen                        | Per kwartaal    | Wouter      |
| Offboarding checklist uitvoeren bij einde traject | Bij offboarding | Stef/Wouter |

---

## Mapping naar Wouter's 6 punten

| Wouter's punt              | Documenten                                       | Status         |
| -------------------------- | ------------------------------------------------ | -------------- |
| 1. Datamapping per traject | `docs/security/datamapping.md`                   | Gedocumenteerd |
| 2. Toegangsbeheer          | `docs/security/credentials.md` + SEC-001/002/004 | Open acties    |
| 3. Contractparagraaf       | Actie 2.7 (Wouter)                               | Nog te doen    |
| 4. Incidentprotocol        | `docs/security/incident-protocol.md`             | Gedocumenteerd |
| 5. Toolbeleid              | Actie 2.8 + `docs/security/datamapping.md`       | Deels gedaan   |
| 6. Offboarding             | `docs/security/offboarding-checklist.md`         | Gedocumenteerd |
