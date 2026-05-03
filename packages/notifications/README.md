# @repo/notifications

Transactional e-mail (Resend) voor klant-portal events. Wordt aangeroepen vanaf
de server-action laag (`apps/cockpit`, `apps/devhub`) zodra een mutation slaagt.

## Wanneer gebruiken

- Cockpit PM-review-actie (endorse / decline / defer / convert) → `notifyFeedbackStatusChanged`.
- DevHub `updateIssueAction` met statuswijziging naar `in_progress` of `done`
  → `notifyFeedbackStatusChanged`.
- Cockpit `replyAsTeamAction` → `notifyTeamReply`.

**Niet hierin:** `@repo/database`-mutations (zou een circulaire dep maken — zie
CC-002 §6). Mail-trigger leeft altijd op de action-laag, na de mutation-success.

## Publieke exports

### `@repo/notifications`

- `sendMail({ to, subject, html, text, tag })` — low-level wrapper. Skip in dev
  (alles behalve `NODE_ENV=production`) tenzij `RESEND_FORCE_SEND=1`.
- `notifyFeedbackStatusChanged(issue, newStatus, client?)` — kiest template
  voor de nieuwe status, haalt klant-recipients op, stuurt mail.
- `notifyTeamReply(parentQuestion, replyBody, client?)` — mail bij team-reply
  op een klant-vraag.
- `pickTemplateForStatus(status)` — pure helper; retourneert `null` voor
  statussen zonder mail-trigger.

## Env-vars

- `RESEND_API_KEY` — Resend service-key, server-only.
- `RESEND_FROM_EMAIL` — verified sender op het Resend-domein. Mag een kale
  mailbox zijn (`team@jouw-ai-partner.nl`) — `sendMail` wrapt 'm dan met de
  hardcoded brand-naam tot `Jouw AI Partner <team@jouw-ai-partner.nl>`. Wil
  je een afwijkende display-naam, zet de hele `Naam <email>` zelf in de var;
  die wordt dan ongewijzigd doorgegeven.
- `NEXT_PUBLIC_PORTAL_URL` — basis-URL voor deeplinks in templates.
- `RESEND_FORCE_SEND` (optioneel) — zet op `"1"` om de dev-mode-skip te
  overrulen voor staging-tests.

## Spambox-mitigaties

`sendMail` zet op iedere mail een `List-Unsubscribe: <mailto:…?subject=Unsubscribe>`
header (Gmail/Yahoo bulk-spec, februari 2024). Het doel-adres is de
from-mailbox; afmeldverzoeken komen v1 binnen op die inbox en worden handmatig
door het team verwerkt. Zodra volume groeit kan dit upgraden naar RFC-8058
one-click via een portal-endpoint.

Display-name in de `From` is een spam-signaal-reductor: kale `email@…` headers
worden door Gmail vaker als bot/phishing geclassificeerd dan
`Naam <email@…>`.

## Dev-mode

In alles behalve `NODE_ENV=production` slaat `sendMail` de API-call over en
logt alleen via `console.info`. Dit voorkomt per-ongeluk-spam tijdens lokale
dev. Zet `RESEND_FORCE_SEND=1` voor opt-in.

## Best-effort

Beide `notify*`-helpers vangen errors zelf (try/catch + log). Een Resend-outage
laat de mutation NIET falen — mail is best-effort, mutation is SoT.

Per-recipient gebruiken de orchestrators `Promise.allSettled` (CC-007), zodat
één failing adres (bv. bounce of Resend-4xx) niet de andere klant-mails kapot
maakt. Een aggregaat `partial failure`-log gaat naar `console.error`; Resend
logt de individuele errors zelf.

## Fail-loud op ontbrekende `NEXT_PUBLIC_PORTAL_URL`

`requirePortalUrl()` in `src/client.ts` is de centrale guard. Zonder env-var
sturen we **geen mail** — een mail met dode CTA (`/projects/.../`) komt nooit
buiten de notify-laag uit. De skip wordt op `console.error` gelogd zodat de
operator hem niet via het Resend-dashboard hoeft te ontdekken (CC-007).

## Rate-limit klant-compose

De portal-action `sendMessageAsClientAction` blokkeert klanten op meer dan
10 root-messages per uur (`countClientRootMessagesInLastHour`). Drempel is
conservatief; afstellen op data, niet vooraf. Bij volume-zorgen later naar
Redis. Replies en team-messages vallen niet onder dit limiet.

## Tests

- `__tests__/send.test.ts` — payload-capture-mock op `resend`, dev-mode-skip,
  ontbrekende env-vars, error-pad.
- `__tests__/templates/*.test.ts` — verifieert subject + body + deeplink per template.
- `__tests__/notify/*.test.ts` — pickt juiste template, filtert non-client
  recipients, swallowt errors.
