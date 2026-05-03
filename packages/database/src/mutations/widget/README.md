# mutations/widget/

Write-operaties voor het embedded feedback-widget. Drie scopes: ingest van
widget-issues, beheer van de domain-whitelist, en rate-limiting van de
publieke endpoint.

Externe consumers importeren `from "@repo/database/mutations/widget"`.

## Files

| File            | Rol                                                                                                    | Hoofdexports                            |
| --------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| `index.ts`      | Publieke barrel.                                                                                       | —                                       |
| `feedback.ts`   | Wrapper rond `insertIssue` voor binnenkomende widget-feedback. Forceert `source = 'jaip_widget'`.      | `insertWidgetIssue`                     |
| `admin.ts`      | Beheer van de widget-domain-whitelist vanuit DevHub admin-UI.                                          | `addWidgetDomain`, `removeWidgetDomain` |
| `rate-limit.ts` | Atomische `+1` op de `widget_rate_limits`-counter via Postgres-RPC `increment_rate_limit` (race-vrij). | `incrementRateLimit`                    |

## Design decisions

- **`insertWidgetIssue` mapt widget-types naar issue-types** (bug/idea/question → bug/feature_request/question) en zet altijd `source = 'jaip_widget'`. Test-submissies krijgen label `'test'` zodat ze uit klant-views gefilterd kunnen worden.
- **Geen `priority` op insert.** De DB-default (`'medium'`) komt over; AI-classificatie (DH-006) vult later het echte priority-veld.
- **Title-fallback uit eerste regel beschrijving.** Cap op 200 chars zodat de DB-index op `title` niet ontploft.
- **Rate-limit gebruikt Postgres-RPC `increment_rate_limit`.** PostgREST `upsert(...)` kan zelf geen `count + 1` uitdrukken; RPC houdt het row-locked + race-vrij in de DB.
- **Rate-limit gooit door bij DB-error** zodat de aanroepende util fail-open kan beslissen — geen silent zero die 30/uur stilletjes naar oneindig kantelt.
- **`addWidgetDomain` is idempotent.** PK conflict (23505) bij dubbel-toevoegen → `success: true`, andere errors propageren wel.
