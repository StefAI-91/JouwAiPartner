# PRD: Portal Roadmap & Changelog — Topic-Curatie + Klant-Loop

|             |                                                                 |
| ----------- | --------------------------------------------------------------- |
| **Klant**   | CAI Automations (trigger) — daarna alle JAIP-klanten            |
| **Versie**  | 1.0                                                             |
| **Datum**   | 27 april 2026                                                   |
| **Status**  | Draft — fase 1 ready voor sprint-spec, fase 2-5 conceptueel     |
| **Auteur**  | Stef Banninga (gesprek met Claude)                              |
| **Branch**  | `claude/add-portal-changelog-77Mhh`                             |
| **Relatie** | Bouwt voort op [`prd-client-portal/`](../prd-client-portal/) v1 |

---

## Inhoud

1. [Samenvatting](./01-samenvatting.md)
2. [Probleem & Context](./02-probleem-context.md)
3. [Marktonderzoek — Hoe doen anderen dit?](./03-marktonderzoek.md)
4. [Conceptueel Model — De Drie Lagen](./04-conceptueel-model.md)
5. [Fase-strategie & Verificatie-momenten](./05-fases-strategie.md)
6. [Fase 1 — Basis: Topics + 4-Bucket Portal](./06-fase-1-basis.md)
7. [Fase 2 — Klant-signalen](./07-fase-2-klant-signalen.md)
8. [Fase 3 — Lifecycle Automation + Audit](./08-fase-3-lifecycle.md)
9. [Fase 4 — Narratieve Snapshots](./09-fase-4-narratief.md)
10. [Fase 5 — AI-Acceleratie](./10-fase-5-ai-acceleratie.md)
11. [Data Model — Cross-fase](./11-data-model.md)
12. [DevHub Workflow — Hoe Devs Topics Volgen](./12-devhub-workflow.md)
13. [Validatie & Open Vragen](./13-validatie-en-open-vragen.md)
14. [Design-keuzes](./14-design-keuzes.md)

---

## Snelle TL;DR

Klanten verzuipen in user-submitted issues. Eén klant (CAI Studio) maakt zelf wekelijkse Notion-digests omdat onze raw issue-lijst onleesbaar is. We bouwen een **drie-lagen-model** in de Portal:

1. **Issues** (DevHub, granulair, intern)
2. **Topics** (curatielaag, klant-taal, 1:N issues)
3. **Status Reports** (snapshots, narratief, optioneel)

Klant ziet topics in 4 buckets (Recent gefixt / Komende week / Hoge prio / Niet geprioritiseerd) en geeft signaal via knoppen (🔥👍👎). Team beslist met dat signaal als input — niet als directe sturing.

We bouwen dit in **5 fases**, elk standalone shippable. Fase 1 (basis topics + buckets) is direct bruikbaar; fase 5 (AI-clustering) komt pas als de patronen handmatig zijn geleerd.

> Volledige reasoning per fase in sectie 6-10. Marktvergelijking in sectie 3. Open vragen in sectie 13. Visuele identiteit + lessen uit de design-preview in sectie 14.
