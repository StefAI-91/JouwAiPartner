# Security Baseline — JouwAiPartner

Pragmatische security baseline per project. Geen 80-pagina beleidsdocument, maar een werkbare standaard.

## Documenten

| Document                                               | Inhoud                                             | Wouter's punt |
| ------------------------------------------------------ | -------------------------------------------------- | ------------- |
| [audit-report.md](./audit-report.md)                   | 17 bevindingen met ernst, locatie en fix           | —             |
| [datamapping.md](./datamapping.md)                     | Data per integratie: wat gaat erin, wat komt eruit | 1             |
| [credentials.md](./credentials.md)                     | Secrets inventaris + rotatieprotocol               | 2             |
| [action-plan.md](./action-plan.md)                     | Geprioriteerd plan in 4 fases                      | —             |
| [incident-protocol.md](./incident-protocol.md)         | Beslisboom bij incidents + klantcommunicatie       | 4             |
| [offboarding-checklist.md](./offboarding-checklist.md) | Checklist bij einde traject + SQL template         | 6             |

## Nog te doen (door Wouter)

- **Punt 3:** Standaard contractparagraaf dataverwerking
- **Punt 5:** Goedgekeurde tools lijst (technische input staat in datamapping.md)

## Bijwerken

- Bij nieuwe integratie: update `datamapping.md` en `credentials.md`
- Bij security fix: update `audit-report.md` (markeer als opgelost)
- Bij incident: maak `incidents/[datum]-[beschrijving].md`
- Bij einde traject: volg `offboarding-checklist.md`
