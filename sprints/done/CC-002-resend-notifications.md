# Micro Sprint CC-002: Resend Notificaties (Klantgericht)

## Doel

Bouw de notificatie-laag die de Inbox uit CC-001 levend maakt: stuur per-event een e-mail naar de klant zodra er iets in zijn portal gebeurt — een verzoek dat is geaccepteerd, afgewezen, geparkeerd, of een nieuw antwoord van het team. Zonder deze laag bezoekt niemand het portal en valt iedereen terug op e-mail; mét deze laag wordt het portal het primaire kanaal.

Team-side notificaties blijven in CC-002 buiten scope (in-app counter in cockpit-sidebar volstaat — vision §8). Eindgebruikers van de embedded widget krijgen géén directe mail (ze hebben vaak geen profiel; PM informeert hun klant-PM samengevat in CC-005 — buiten scope).

Dit is sprint 2 van 5 (CC-001 t/m CC-005) afgeleid uit `docs/specs/vision-customer-communication.md` §12.

## Vision-alignment

- `docs/specs/vision-customer-communication.md` **§8** — Notificaties: "Resend (transactional email). Client-side triggers: every status update or new team-message generates an immediate email to the client. The email contains a clear summary and a deep-link to the relevant inbox item. No digesting in v1."
- **§10 #1** — Decided: Resend voor immediate per-event mail.
- **§9** — UX: AI-gegenereerde antwoorden moeten ook "approve op mobiel" goed werken; daar hoort een mail-trigger achter zodat klant snel weet dat er iets is.

## Afhankelijkheden

- **CC-001** — levert `endorseIssue` / `declineIssue` / `deferIssue` / `convertIssueToQuestion` mutations + de cockpit server-actions die ze aanroepen + nieuwe `issues`-statussen. CC-002 wired notificaties op de action-laag (zie taak 6).
- **PR-022** — `client_questions` tabel + `replyToQuestion` mutation in `packages/database/src/mutations/client-questions.ts:104-172`. CC-002 wired notificatie in de cockpit-action die `role: "team"` aanroept.
- Bestaande issue-update via `updateIssue` (`packages/database/src/mutations/issues/core.ts:92`) — fire-on-status-change-naar-`in_progress`/`done` op de DevHub-action-laag.
- Bestaande recipient-lookup: `listPortalProjectAssignees` in `packages/database/src/queries/portal/access.ts:78` (filtert op `role: "client"`-leden van het project en levert e-mailadressen via `profiles`-join op regel 88).
- **Resend-account + verified domain bestaan al** in productie, met `RESEND_API_KEY` reeds gezet in Vercel env. Geen account-onboarding of DNS-werk nodig in deze sprint.
- ENV-vars die de spec gebruikt:
  - `RESEND_API_KEY` — bestaat al in Vercel (productie + preview, server-only).
  - `RESEND_FROM_EMAIL` — verifieer in Vercel; zet als ontbreekt (bv. `notifications@jouwaipartner.nl`).
  - `NEXT_PUBLIC_PORTAL_URL` — bestaat al, gedocumenteerd in `docs/ops/deployment.md`. Gebruikt voor deeplinks in mail-templates. **Spec gebruikte voorheen `PORTAL_BASE_URL` — dat hernoemen naar de bestaande variable, niet een nieuwe introduceren.**
  - `RESEND_FORCE_SEND` (nieuw, optioneel) — `"1"` om dev-mode-skip te overrulen voor staging-tests.

## Open vragen vóór start

1. **Fire-and-forget of fire-and-await?** Aanbeveling: **fire-and-forget met `try/catch`+`console.error`**, zodat een Resend-outage NOOIT een mutation laat falen. De mutation is de SoT; mail is best-effort. Defer dead-letter-queue + retries naar later sprint als 5xx ratio omhoog gaat.
2. **Nieuwe inkomende feedback (klant submit zelf via portal/widget): bevestigingsmail?** Aanbeveling: **NEE in v1**. De portal toont onmiddellijk feedback; een mail "we hebben je verzoek ontvangen" voor iets wat de klant zelf net heeft ingetypt voelt overbodig. Wel een mail bij PM-acceptatie/afwijzing — daar wéét de klant niet anders dat er iets gebeurt.
3. **Eindgebruiker-widget items**: vandaag heeft een eindgebruiker via embedded widget vaak geen `profile.email`. Aanbeveling: **mail in v1 alleen versturen als er een geldige `profile.email` te vinden is voor het project — anders skip silent**. Cockpit-PM ziet 't sowieso in zijn inbox; eindgebruiker-feedback-loop komt in CC-005.
4. **Dev-mode**: in `NODE_ENV=development` echt mailen of console-loggen? Aanbeveling: **log naar console + skip Resend-API-call** als `RESEND_API_KEY` ontbreekt of `NODE_ENV !== "production"` én geen `RESEND_FORCE_SEND=1` env-flag is gezet. Voorkomt per-ongeluk-spam tijdens lokale dev.
5. **Plain-text of HTML?** Aanbeveling: **HTML met inline styles**, met plain-text fallback (Resend SDK ondersteunt beide in één call). Houdt 't simpel — geen MJML-compiler in v1.

## Taken

Bouwvolgorde **package → ENV → templates → trigger-wiring → tests → docs**. Volg strict; trigger-wiring zonder templates = compile-fout.

### 1. Nieuw package `@repo/notifications`

Pad: `packages/notifications/` (nieuw). Volgt monorepo-convention van `packages/auth/` en `packages/ui/` als template.

Structuur:

```
packages/notifications/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                    # public exports
│   ├── client.ts                   # Resend SDK client singleton
│   ├── send.ts                     # core sendMail() helper
│   ├── templates/
│   │   ├── index.ts                # template registry
│   │   ├── feedback-endorsed.ts
│   │   ├── feedback-declined.ts
│   │   ├── feedback-deferred.ts
│   │   ├── feedback-converted.ts
│   │   ├── feedback-progress.ts    # in_progress
│   │   ├── feedback-done.ts
│   │   └── new-team-reply.ts
│   └── notify/
│       ├── feedback-status.ts      # notifyFeedbackStatusChanged()
│       └── question-reply.ts       # notifyTeamReply()
└── __tests__/
    └── send.test.ts                # boundary-mock-test
```

Dependencies in `package.json`:

```json
{
  "name": "@repo/notifications",
  "dependencies": {
    "resend": "^4.0.0",
    "@repo/database": "workspace:*"
  }
}
```

Voeg toe aan workspace `pnpm-workspace.yaml` of root `package.json#workspaces` (check welke het project gebruikt — vermoedelijk `package.json` op basis van CLAUDE.md).

### 2. ENV-vars + deployment-doc

Het project heeft géén `.env.example`-files; ENV-vars worden gedocumenteerd in `docs/ops/deployment.md` als bullet-list (zie bestaande structuur regel 6-13). Volg dat patroon.

**Wat al bestaat in Vercel** (verifieer vóór sprint-start in Vercel-dashboard, niet aanpassen):

- `RESEND_API_KEY` — productie + preview, server-only.
- `NEXT_PUBLIC_PORTAL_URL` — bestaat al; mail-templates lezen die voor deeplinks.

**Wat erbij komt in Vercel** (zet handmatig vóór deploy van deze sprint):

- `RESEND_FROM_EMAIL` — `notifications@jouwaipartner.nl` (of wat het verified domain dictateert). Server-only.
- `RESEND_FORCE_SEND` — leeg in productie en preview. Lokaal of op staging-test optioneel `"1"` om de dev-mode-skip te overrulen.

**Update `docs/ops/deployment.md`** — voeg een nieuwe sectie "Resend (notificaties)" toe met:

- `RESEND_API_KEY` — bestaande Resend-account; mailen vanuit `notifications@jouwaipartner.nl` (verified domain).
- `RESEND_FROM_EMAIL` — moet matchen met een verified sender op het Resend-domein.
- `RESEND_FORCE_SEND` — uitleg dev-mode-skip + opt-in.

Geen account-onboarding, geen DNS-stappen — die zijn al gedaan.

### 3. Resend-client + send-helper

`packages/notifications/src/client.ts`:

```ts
import { Resend } from "resend";

let client: Resend | null = null;

export function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}
```

`packages/notifications/src/send.ts`:

```ts
export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Tag voor Resend-dashboard filtering, bv. "feedback-endorsed". */
  tag: string;
}

export async function sendMail(
  input: SendMailInput,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const isProd = process.env.NODE_ENV === "production";
  const force = process.env.RESEND_FORCE_SEND === "1";
  const client = getResendClient();

  if (!isProd && !force) {
    console.info("[notifications] dev-mode skip", {
      to: input.to,
      subject: input.subject,
      tag: input.tag,
    });
    return { ok: true };
  }
  if (!client) {
    console.warn("[notifications] RESEND_API_KEY missing — skip", { tag: input.tag });
    return { ok: false, reason: "no_api_key" };
  }

  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    console.error("[notifications] RESEND_FROM_EMAIL missing — fail loud", { tag: input.tag });
    return { ok: false, reason: "no_from_email" };
  }

  const { error } = await client.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    tags: [{ name: "category", value: input.tag }],
  });

  if (error) {
    console.error("[notifications] resend error", { tag: input.tag, error: error.message });
    return { ok: false, reason: error.message };
  }
  return { ok: true };
}
```

### 4. Templates

Eén template-file per type. Elk export een functie `(props) => { subject, html, text }`. Houd HTML klein en consistent — één layout-helper voor header/footer/CTA-button:

`packages/notifications/src/templates/_layout.ts`:

```ts
export function renderLayout(opts: {
  title: string;
  bodyHtml: string;
  ctaUrl: string;
  ctaLabel: string;
}): string {
  return `<!doctype html>
  <html><body style="font-family:system-ui,sans-serif;...">
    <h2>${opts.title}</h2>
    ${opts.bodyHtml}
    <p><a href="${opts.ctaUrl}" style="display:inline-block;padding:12px 18px;background:#111;color:#fff;text-decoration:none;border-radius:6px;">${opts.ctaLabel}</a></p>
    <hr/><p style="color:#666;font-size:12px;">Jouw AI Partner — automatische melding</p>
  </body></html>`;
}
```

Per template (zeven stuks):

| Template             | Trigger                         | Subject (NL)                              | CTA                                                                                        |
| -------------------- | ------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------ |
| `feedback-endorsed`  | CC-001 `endorseIssue`           | "Je verzoek staat in de planning"         | "Bekijk in portal" → `${NEXT_PUBLIC_PORTAL_URL}/projects/${projectId}/feedback/${issueId}` |
| `feedback-declined`  | CC-001 `declineIssue`           | "Update over je verzoek"                  | "Lees uitleg" → portal-deeplink                                                            |
| `feedback-deferred`  | CC-001 `deferIssue`             | "We parkeren dit voor later"              | "Bekijk status"                                                                            |
| `feedback-converted` | CC-001 `convertIssueToQuestion` | "We hebben hier een vraag over"           | "Beantwoord vraag" → inbox                                                                 |
| `feedback-progress`  | `updateIssue` → `in_progress`   | "We zijn ermee aan de slag"               | "Volg voortgang"                                                                           |
| `feedback-done`      | `updateIssue` → `done`          | "Klaar — bekijk wat we hebben opgeleverd" | "Bekijk resultaat"                                                                         |
| `new-team-reply`     | `replyToQuestion(role:"team")`  | "Je hebt een nieuw antwoord"              | "Open inbox" → `/projects/${projectId}/inbox`                                              |

Voor `feedback-declined` neemt de body de `decline_reason` rechtstreeks over (afkomstig uit `issues.decline_reason`-kolom uit CC-001) — geen herschrijving, geen AI-tussenstap. Vision §5 "Decline UX" wil dat klant exact ziet wat PM heeft genoteerd.

### 5. Notify-orchestrators (notify/\*)

Twee high-level helpers die templates kiezen + recipient lookup + `sendMail` aanroepen. Mutations roepen ALLEEN deze orchestrators aan, niet de templates direct.

`packages/notifications/src/notify/feedback-status.ts`:

```ts
export async function notifyFeedbackStatusChanged(
  issue: Pick<
    IssueRow,
    "id" | "project_id" | "title" | "client_title" | "status" | "decline_reason"
  >,
  newStatus: IssueStatus,
  client?: SupabaseClient,
): Promise<void> {
  const recipients = await listPortalProjectAssignees(issue.project_id, "client", client);
  if (recipients.length === 0) return; // skip eindgebruiker-only items
  const template = pickTemplateForStatus(newStatus);
  if (!template) return; // status-wijziging zonder mail-trigger
  const props = { issue, portalUrl: process.env.NEXT_PUBLIC_PORTAL_URL ?? "" };
  await Promise.all(
    recipients.map((r) =>
      sendMail({ to: r.email, ...template(props), tag: `feedback-${newStatus}` }),
    ),
  );
}
```

`pickTemplateForStatus(newStatus)` mapt:

- `triage` (vanuit `needs_pm_review`) → `feedback-endorsed`
- `declined` → `feedback-declined` (sobere mail met de raw `decline_reason` — vision §5 wil dat klant exact ziet wat PM heeft genoteerd)
- `deferred` → `feedback-deferred`
- `converted_to_qa` → `feedback-converted`
- `in_progress` → `feedback-progress`
- `done` → `feedback-done`
- `needs_pm_review`, `backlog`, `todo`, `cancelled` → `null` (geen mail)

CC-004 (AI-draft) is gedeferred — deze mapping blijft het permanente eindstation, niet een tussenstap. Als CC-004 ooit ontdooit, evalueren we daar of de decline-template via AI moet of dat sober beter blijft.

`packages/notifications/src/notify/question-reply.ts`:

```ts
export async function notifyTeamReply(
  parentQuestion: ClientQuestionRow,
  replyBody: string,
  client?: SupabaseClient,
): Promise<void> {
  const recipients = await listPortalProjectAssignees(parentQuestion.project_id, "client", client);
  if (recipients.length === 0) return;
  const props = {
    question: parentQuestion,
    replyPreview: replyBody.slice(0, 200),
    portalUrl: process.env.NEXT_PUBLIC_PORTAL_URL ?? "",
  };
  await Promise.all(
    recipients.map((r) =>
      sendMail({ to: r.email, ...newTeamReplyTemplate(props), tag: "new-team-reply" }),
    ),
  );
}
```

### 6. Trigger-wiring op de server-action laag (geen mutation-wiring)

**Architecturale keuze:** notify-calls leven in de server-action laag (`apps/cockpit/...`, `apps/devhub/...`, `apps/portal/...`), **niet** in `@repo/database`-mutations. Twee redenen:

1. **Geen circulaire dependency.** Als `@repo/database`-mutations `@repo/notifications` importeren, en notifications terug-importeert uit database (voor types/queries), ontstaat een cycle. Door notify-calls op de action-laag te plaatsen importeert alleen `apps/*` uit `@repo/notifications` — `@repo/database` blijft notifications-vrij.
2. **CLAUDE.md-conform.** "Data muteren via Server Actions" — notify-side-effects horen op dezelfde laag als de mutation-call, niet in de pure DB-helper.

`@repo/notifications` mag wél types importeren uit `@repo/database` (`IssueRow`, `ClientQuestionRow`) en runtime-queries (`listPortalProjectAssignees`) — die richting is acyclisch.

#### 6a. CC-001 PM-review-actions (cockpit)

In `apps/cockpit/src/features/inbox/actions/pm-review.ts` (uit CC-001 taak 6) — voeg in elke van de vier server-actions één call toe **direct ná** de mutation-success-check, **vóór** de `revalidatePath`:

```ts
const result = await endorseIssue(parsed.data.issueId, profile.id, supabase);
if ("error" in result) return result;

await notifyFeedbackStatusChanged(result.data, "triage").catch((e) =>
  console.error("[notify] endorseIssue", e),
);

revalidatePath("/inbox");
return { success: true };
```

Zelfde patroon voor `declineIssueAction` (status `declined` + `decline_reason` doorgeven), `deferIssueAction` (`deferred`), `convertIssueAction` (`converted_to_qa`).

#### 6b. DevHub status-update-action

In `apps/devhub/src/features/issues/actions/` (zoek de action die `updateIssue` aanroept — vermoedelijk `update-issue.ts` of vergelijkbaar). Pattern:

```ts
const before = await getIssueById(input.id, supabase);
const result = await updateIssue(input, supabase);
if ("error" in result) return result;

if (before?.status !== result.data.status && ["in_progress", "done"].includes(result.data.status)) {
  await notifyFeedbackStatusChanged(result.data, result.data.status).catch((e) =>
    console.error("[notify] updateIssue", e),
  );
}
```

Andere status-changes triggeren NIET (zie pickTemplateForStatus in taak 5).

#### 6c. Cockpit team-reply-action (CC-001)

In `apps/cockpit/src/features/inbox/actions/replies.ts` (uit CC-001 taak 6) — voeg toe ná `replyToQuestion`-success:

```ts
const result = await replyToQuestion(parsed.data, { profile_id, role: "team" }, supabase);
if ("error" in result) return result;

await notifyTeamReply(parent, parsed.data.body).catch((e) =>
  console.error("[notify] replyAsTeam", e),
);
```

Portal-side `replyToQuestion` met `role: "client"` blijft notify-loos — team-notificatie is in-app counter, geen mail (vision §8). Centraliseer dat door portal-action GEEN notify aan te roepen.

### 7. Tests

Mock-grens-beleid (CLAUDE.md): mock alleen `resend` (externe netwerk), nooit eigen `notify/*`-functies.

- **`packages/notifications/__tests__/send.test.ts`**:
  - Skip in dev (`NODE_ENV=test`, geen `RESEND_FORCE_SEND`) — verifieer console.info call, geen Resend-API-call.
  - Met `RESEND_FORCE_SEND=1` — payload-capture mock van `resend.emails.send`, asserteer `from`/`to`/`subject`/`tags` correct.
  - Resend retourneert error → return `{ ok: false }`, geen throw.

- **`packages/notifications/__tests__/templates/*.test.ts`** (zeven mini-tests):
  - Voor elk template: verifieer subject/text/html bevat de juiste props (issue-titel, decline-reason, deeplink met `projectId` + `issueId`).

- **`packages/notifications/__tests__/notify/feedback-status.test.ts`**:
  - Geen recipients → geen `sendMail` calls.
  - Statussen `needs_pm_review`/`backlog`/`todo`/`cancelled` → geen mail (template-pick returns null).
  - Status `triage` → `sendMail` 1x per recipient met `tag: feedback-triage`.

- **Action-integratie-tests** (uitbreiding op CC-001 cockpit-action tests):
  - `endorseIssueAction` triggers `notifyFeedbackStatusChanged` met status `triage` (capture-mock op `@repo/notifications`).
  - `declineIssueAction` triggers met status `declined` + reason in props.
  - `replyAsTeamAction` triggert `notifyTeamReply`; portal `replyAsClientAction` triggert het NIET (avoids self-notify-loop).
  - DevHub `updateIssueAction` triggert alleen bij transitie naar `in_progress` of `done`, niet bij andere status-changes.
- **Mutations blijven notify-loos** — verifieer in `packages/database/__tests__/mutations/issues-pm-review.test.ts` (uit CC-001) dat ze géén `@repo/notifications` importeren (grep-test of build-test).

### 8. Docs + registry

- Update `CLAUDE.md` "Tech Stack" sectie: voeg "Resend" toe naast bestaande tech.
- Update `docs/ops/deployment.md`: ENV-vars + Resend setup-stappen.
- Update `docs/specs/vision-customer-communication.md` §10 #1: markeer als "Implemented in CC-002".
- Update `sprints/backlog/README.md`: voeg CC-002 rij toe in dezelfde stijl als CC-001.

## Acceptatiecriteria

- [ ] `packages/notifications/` bestaat met Resend-client, sendMail-helper, 7 templates, 2 notify-orchestrators.
- [ ] `RESEND_FROM_EMAIL` en `RESEND_FORCE_SEND` toegevoegd aan Vercel env (productie + preview). `RESEND_API_KEY` en `NEXT_PUBLIC_PORTAL_URL` waren al gezet — geverifieerd in dashboard.
- [ ] `docs/ops/deployment.md` heeft nieuwe sectie "Resend (notificaties)" met de drie variabelen + dev-mode-skip-uitleg.
- [ ] In `NODE_ENV !== "production"` zonder `RESEND_FORCE_SEND=1`: geen Resend-API-call, wel `console.info` log.
- [ ] In productie: 4 PM-acties uit CC-001 sturen mail met juist template + tag.
- [ ] `updateIssue` detecteert status-transitie naar `in_progress` en `done` en triggert respectieve mail. Andere status-changes triggeren NIET.
- [ ] `replyToQuestion` met `role: "team"` triggert `new-team-reply` mail; `role: "client"` triggert geen mail.
- [ ] Eindgebruiker-widget items (geen `profile.email` linkage) → geen mail, geen error.
- [ ] Decline-mail bevat de exacte `decline_reason`-tekst die PM heeft ingevoerd.
- [ ] Alle templates bevatten een werkende deep-link `${NEXT_PUBLIC_PORTAL_URL}/projects/${projectId}/...`.
- [ ] Resend-error in productie laat de mutation NIET falen (try/catch + log).
- [ ] Geen circulaire dependency tussen `@repo/database` en `@repo/notifications`. `@repo/database`-mutation-bestanden importeren GEEN `@repo/notifications` (notify-wiring leeft op action-laag in `apps/*`).
- [ ] `npm run typecheck`, `npm run lint`, `npm test` allemaal groen.
- [ ] `sprints/backlog/README.md` bevat CC-002 rij.
- [ ] CC-002 alleen aan vision §10 #1 markering toevoegen ("Implemented") nadat sprint klaar is.

## Risico's

| Risico                                                                                         | Mitigatie                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Resend-outage stopt issue-mutations als notify-call sync faalt.                                | Strict `try/catch` rondom elke `notify*`-call; mutation completed op DB-succes ongeacht mail-result.                                                                                                                                                                                           |
| Spam tijdens dev: developer endorsed test-issues → 50 mails naar productie-klanten.            | `NODE_ENV !== production` skipt Resend default. `RESEND_FORCE_SEND=1` als bewuste opt-in voor staging.                                                                                                                                                                                         |
| Circulaire dep `database` ↔ `notifications`.                                                   | Architecturaal opgelost (taak 6): notify-calls leven op de action-laag (`apps/*`), niet in `@repo/database`-mutations. Notifications importeert types + queries uit database (acyclisch). Verifieer met `npm run typecheck` + grep dat geen mutation-bestand `@repo/notifications` importeert. |
| Mail komt aan in spam-folder zonder verified domain.                                           | Resend-onboarding stap: SPF + DKIM + DMARC op `jouwaipartner.nl` via DNS. Buiten code-scope maar moet voor go-live.                                                                                                                                                                            |
| Race condition: PM endorsed binnen 2s na klant-submit, klant krijgt twee mails kort na elkaar. | Geen mail bij submit (zie open vraag #2) → klant krijgt alléén één mail bij PM-actie.                                                                                                                                                                                                          |
| Gebruiker heeft meerdere e-mails (niet ondersteund door `profiles.email` één-op-één).          | Out-of-scope; v1 stuurt alleen naar primaire `profiles.email`.                                                                                                                                                                                                                                 |
| Resend-rate-limits bij batch-acties (PM endorsed 20 issues tegelijk).                          | Resend free-tier = 100 mails/dag; bij hogere volumes upgrade plan. Niet nu mitigeren.                                                                                                                                                                                                          |

## Niet in scope

- **Team-notificaties via mail/Slack** — vision §8 expliciet "in-app only voor team". CC-001 levert sidebar-counter, dat is genoeg tot team groeit.
- **Bevestigingsmail bij submit** — open vraag #2: nee in v1.
- **Eindgebruiker-widget mail-notificatie** — geen `profile.email` linkage; komt in CC-005 als groepering-flow.
- **Digest-mail / "samenvatting deze week"** — vision §8 expliciet "no digesting in v1".
- **AI-draft van mail-content** — templates zijn statisch met variabele inhoud. AI-gepersonaliseerde mails komen mogelijk in CC-004 (outbound).
- **Klant-opt-out van notificaties** — niet nu; klant kan in Resend "unsubscribe" als ze willen, maar geen UI in portal.
- **Inbound mail-replies** (klant antwoordt op notification-mail) — Resend ondersteunt het, maar parsen + terug-routen is een aparte sprint.
- **Retry-queue / dead-letter** — fire-and-forget v1; observability via Resend-dashboard tags.

## Vision-alignment (samenvatting)

CC-002 implementeert vision §8 (Notifications) en activeert vision §10 decision #1 (Resend). Zonder deze sprint is CC-001 een mooie inbox die niemand bezoekt. Na voltooiing zijn de eerste twee CC-sprints "feature-complete" voor de basisflow: klant indient → PM beslist → klant krijgt mail → klant kijkt in portal.

CC-003 (DevHub source-badge) blijft daarna een visuele polish-sprint zonder dat data of flow verandert; CC-004 (outbound met AI-draft) is de volgende grote architectonische stap.
