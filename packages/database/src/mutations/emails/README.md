# mutations/emails/

Mutations voor de emails-feature. Externe consumers importeren `from "@repo/database/mutations/emails"`; de interne file-splitsing is een implementatie-detail.

## Files

| File             | Rol                                                                                                                                                                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`       | Publieke barrel.                                                                                                                                                                                                                          |
| `accounts.ts`    | Google OAuth-account ops: `upsertGoogleAccount`, `updateGoogleAccountTokens`, `updateGoogleAccountLastSync`, `deactivateGoogleAccount`.                                                                                                   |
| `rows.ts`        | emails-table writes: `insertEmails` (upsert van Gmail-sync) + per-veld updates (`updateEmailClassification`, `updateEmailFilterStatus`, `updateEmailSenderPerson`, `updateEmailType`, `updateEmailPartyType`, `updateEmailOrganization`). |
| `review.ts`      | Review-gate RPC's: `verifyEmail`, `verifyEmailWithEdits`, `rejectEmail`. Server-side Supabase functions houden status-transities + audit atomic.                                                                                          |
| `linking.ts`     | email_projects: `linkEmailProject`, `unlinkEmailProject`.                                                                                                                                                                                 |
| `extractions.ts` | `insertEmailExtractions` (bulk insert van AI-output).                                                                                                                                                                                     |

## Design decisions

- **`updateEmailClassification` als één compound-update.** De AI-pipeline schrijft organization, type, party-type, relevance, processed-flag in één write — atomic terwijl klassificatie loopt.
- **RPC voor review-flow.** `verify_email` en `reject_email` zijn server-side Postgres functions zodat status + audit-trail in één transactie veranderen. Edits/rejected/type-changes worden als JSON-arrays meegegeven.
- **`insertEmails` upsert met `ignoreDuplicates`.** Gmail-IDs zijn stabiel; opnieuw syncen mag niet leiden tot duplicates.
- **Per-veld update functies** (sender_person, type, party-type, organization) zijn UI-driven — wijzigingen vanuit de email-detail pagina. Niet-gespecificeerde velden blijven onaangeroerd.

## SRP-013

Vóór SRP-013 stond alles in één `emails.ts` (295 r, 17 exports). Splitsing volgt het cluster-criterium uit CLAUDE.md (≥2 sub-domeinen die elk ≥3 functies bevatten + correspondentie met `features/emails/` in cockpit).
