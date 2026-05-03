# Feature: Questions (DevHub)

Team↔klant-vragen — DevHub-zijde van de `client_questions`-flow. Het team
stelt vanuit een topic of issue een vraag aan de klant; de klant beantwoordt
vanuit Portal; replies komen inline terug in de thread. Spec: PR-022/023.

In v1 zit de UI ingebed op de topic-detail-page (`OpenQuestionsBlock`); een
losse `/questions`-route bestaat (nog) niet.

## Menu per laag

### `actions/`

| File           | Exports                                  | Gebruikt door                           |
| -------------- | ---------------------------------------- | --------------------------------------- |
| `questions.ts` | `askQuestionAction`, `replyAsTeamAction` | `ask-question-modal`, `question-thread` |

- `askQuestionAction` accepteert alleen `project_id` + body (+ optionele
  `topic_id`/`issue_id`/`due_date`); `organization_id` wordt server-side
  afgeleid uit het project (anti-spoof).
- `replyAsTeamAction` hergebruikt `replyToQuestionSchema` uit
  `@repo/database/validations/client-questions`.

### `components/`

| File                       | Rol                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------- |
| `ask-question-modal.tsx`   | Knop + dialog om als team een vraag te stellen (project-/topic-/issue-context komt via props).          |
| `question-thread.tsx`      | Inline expandable thread voor één vraag, met reply-form voor het team.                                  |
| `open-questions-block.tsx` | Server Component — section met alle openstaande vragen voor een project (optioneel gefilterd op topic). |

## Gerelateerde packages (NIET in deze feature)

| Pad                                           | Rol                                                     |
| --------------------------------------------- | ------------------------------------------------------- |
| `@repo/database/queries/client-questions`     | `listOpenQuestionsForProject`, `ClientQuestionListRow`. |
| `@repo/database/mutations/client-questions`   | `sendQuestion`, `replyToQuestion`.                      |
| `@repo/database/validations/client-questions` | `replyToQuestionSchema`, `sendQuestionSchema`.          |
| `@repo/database/queries/projects`             | `getProjectOrganizationId` (project → org afleiden).    |

## Design decisions

- **Geen aparte `/questions`-route in v1.** De block leeft op topic-detail
  (sprint-aanname A van PR-023) — DevHub heeft geen project-detail-page om
  hem op te plaatsen, dus inline daar.
- **`organization_id` afleiden, niet accepteren.** Form-payloads kunnen niet
  vertrouwd worden; de action haalt org zelf op via `project_id`. Voorkomt
  cross-tenant question-leak.
- **`replyAsTeamAction` revalideert `/topics` én `/issues` (layout).** De
  parent kan aan een topic of issue hangen — beide revalideren is goedkoop
  en voorkomt stale threads. Het is de prijs van een action die generiek
  over root-types werkt.
- **Geen eigen `validations/`-laag.** De Zod-schemas staan in
  `@repo/database/validations/client-questions` (gedeeld met Portal-zijde);
  de action wrapt enkel een input-schema voor het ask-flow-payload.
