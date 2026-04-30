# Micro Sprint PR-023: Klant-vragen UI (DevHub + Portal)

## Doel

Op de PR-022 data-laag de minimale UI voor team↔klant-vragen.

- **DevHub**: knop "Stel vraag aan klant" op topic-detail (en optioneel
  issue-detail) → simpele modal met textarea. Plus een blok "Open
  klantvragen" op het project-detail. Geen aparte `/devhub/inbox`-route,
  geen counter in nav, geen tabs/filters — voor 3 reviewers in dezelfde
  Slack is dat overkill.
- **Portal**: nieuwe route `/projects/[id]/inbox` met simpele lijst van
  open vragen, nieuwste boven, inline reply-textarea per vraag. Eén lijst,
  geen drie zones.

> Achtergrond: zie [`docs/specs/prd-portal-roadmap/15-revisie-2026-04-30-bidirectioneel.md`](../../docs/specs/prd-portal-roadmap/15-revisie-2026-04-30-bidirectioneel.md)
> §15.4.3 (post-YAGNI UX).

## Requirements

### DevHub-zijde

| ID         | Beschrijving                                                                                                                  |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------- |
| PR-REQ-260 | DevHub topic-detail krijgt knop "Stel vraag aan klant"                                                                        |
| PR-REQ-261 | Knop opent modal/dialog met body-textarea + optionele due_date-input + organisatie-selector (default afgeleid uit project)    |
| PR-REQ-262 | Submit roept Server Action `askQuestionAction`; modal sluit; toast (of inline banner) bij success                             |
| PR-REQ-263 | Project-detail page (DevHub) krijgt blok "Open klantvragen" — lijst van open vragen op dit project, met laatste reply preview |
| PR-REQ-264 | Per row klikbaar naar inline expand met volledige thread + team-reply-textarea (geen aparte detail-route nodig)               |

### Portal-zijde

| ID         | Beschrijving                                                                                                                      |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------- |
| PR-REQ-280 | Nieuwe route `/projects/[id]/inbox` als nav-link met label `Vragen (N)` (geen aparte badge-component, gewoon string-interpolatie) |
| PR-REQ-281 | Pagina toont één lijst van open vragen, nieuwste boven                                                                            |
| PR-REQ-282 | Per vraag: body, datum, optionele due_date, inline reply-textarea + "Verzenden"-knop                                              |
| PR-REQ-283 | Submit roept Server Action `replyAsClientAction` (mutation `replyToQuestion`)                                                     |
| PR-REQ-284 | Beantwoorde vragen niet zichtbaar op default; link "toon afgehandelde (X)" onderaan toont gevouwen lijst                          |
| PR-REQ-285 | Empty-state: "Het team heeft geen openstaande vragen voor jou" als lijst leeg                                                     |

## Afhankelijkheden

- **PR-022** (DB + queries + mutations + Zod)
- **PR-003** (DevHub topics-feature voor knop op topic-detail)

### Open vragen vóór sprint-start

Geen blokkerende. Notificatie-strategie (email bij nieuwe vraag) is bewust
out-of-scope — komt eventueel in latere sprint na user-feedback.

## Taken

### 1. DevHub — knop + modal

`apps/devhub/src/components/questions/`:

```
questions/
├── ask-question-button.tsx       # Client — knop op topic-detail
├── ask-question-modal.tsx        # Client — modal met form
├── open-questions-block.tsx      # Server — blok op project-detail
└── question-thread.tsx           # Client — inline expand met thread + team-reply
```

CLAUDE.md-update: voeg `questions` toe aan DevHub-compositiepagina's-rij.

### 2. DevHub — Server Actions

`apps/devhub/src/actions/questions.ts`:

```typescript
"use server";
import { sendQuestion, replyToQuestion } from "@repo/database/mutations/client-questions";

export async function askQuestionAction(input: unknown) {
  const client = await getServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { error: "Unauthenticated" };
  const result = await sendQuestion(input, user.id, client);
  revalidatePath("/devhub/projects/[id]", "page");
  return result;
}

export async function replyAsTeamAction(input: unknown) {
  const client = await getServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { error: "Unauthenticated" };
  const result = await replyToQuestion(input, { profile_id: user.id, role: "team" }, client);
  revalidatePath("/devhub/projects/[id]", "page");
  return result;
}
```

### 3. DevHub — integratie op topic-detail + project-detail

- Update topic-detail (uit PR-003) met `<AskQuestionButton topicId organizationId />`
- Update project-detail page met `<OpenQuestionsBlock projectId />` — Server Component die `listOpenQuestionsForProject` aanroept (cross-org of per-org afhankelijk van team-context)
- Question-thread expand toont replies + team-reply textarea inline

### 4. Portal — inbox-route

`apps/portal/src/app/projects/[id]/inbox/page.tsx`:

- Server Component, fetch via `listOpenQuestionsForProject(projectId, organizationId)`
- Render `<QuestionList items={items} />`
- Page-titel: "Vragen van het team"

`apps/portal/src/components/inbox/`:

```
inbox/
├── question-list.tsx           # Server — lijst + handled-collapse
├── question-card.tsx           # Server — body + meta
└── client-reply-form.tsx       # Client — textarea + submit
```

CLAUDE.md-update: voeg `inbox` toe aan Portal-compositiepagina's-rij.

### 5. Portal — Server Action

`apps/portal/src/actions/inbox.ts`:

```typescript
"use server";
export async function replyAsClientAction(input: unknown) {
  const client = await getServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { error: "Unauthenticated" };
  const result = await replyToQuestion(input, { profile_id: user.id, role: "client" }, client);
  revalidatePath("/projects/[id]/inbox", "page");
  return result;
}
```

### 6. Portal — nav-link

Update primaire nav in portal-layout: link naar `/inbox` met label `Vragen (N)` waar `N` = `listOpenQuestionsForProject(...).length`. Cache via React `cache()` 60sec.

Geen `N=0` case: link toont alleen "Vragen". Geen aparte badge-component.

### 7. Tests (minimaal)

- Smoke-test: team stelt vraag via topic-detail → klant ziet 'm in portal-inbox → klant antwoordt → team ziet reply in DevHub-blok → vraag verdwijnt uit "open" lijst
- Vitest: `<ClientReplyForm>` submit roept Server Action met correct input

## Acceptatiecriteria

### DevHub

- [ ] PR-REQ-260..262: knop + modal + submit werken
- [ ] PR-REQ-263/264: blok op project-detail toont open vragen, expand werkt

### Portal

- [ ] PR-REQ-280..285: route + lijst + reply-form + handled-collapse + empty-state

### Algemeen

- [ ] CLAUDE.md registry geüpdatet (DevHub + Portal compositiepagina's)
- [ ] Type-check + lint + check:queries slagen

## Risico's

| Risico                                                              | Mitigatie                                                              |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Klant ziet vraag pas bij volgend portal-bezoek (geen email)         | Bewuste keuze; communiceer in CTA dat antwoord niet realtime is        |
| DevHub-blok op project-detail wordt onoverzichtelijk bij 50+ vragen | v1 alleen open vragen; bij volume verschuiven naar aparte page (later) |
| Eén lijst voelt rommelig bij meerdere typen vragen                  | YAGNI 2026-04-30: kom terug bij ≥20 open vragen tegelijk               |
| Modal vereist toast-library                                         | Optioneel — inline banner of redirect-met-param werkt ook              |

## Bronverwijzingen

- PRD: `docs/specs/prd-portal-roadmap/15-revisie-2026-04-30-bidirectioneel.md` §15.4.3, §15.6

## Vision-alignment

Vision §2.4 — outbound zijde van bidirectioneel kanaal. Eén tabel,
één lijst, één reply-textarea — kleinst mogelijke gespreksruimte die werkt.
