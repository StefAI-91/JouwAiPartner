# Micro Sprint CC-007: Security & Correctness Fixes (review CC-001 t/m CC-006)

## Doel

Verwerk de **blocking-bevindingen** uit de code-quality review op CC-001 t/m CC-006. Dit zijn vijf bugs en vier hoge-impact should-fixes die productie-correctheid raken: één RLS-bypass, één SECURITY DEFINER-zwakheid, één boolean-oracle, één gebroken validation-pad, een onbruikbare mail-CTA, plus directe gevolgen in dezelfde paden (notify-trigger-coverage, defense-in-depth, allSettled).

CC-008 pakt daarna architectuur-drift, README-sync en nits op.

## Vision-alignment

- `vision-customer-communication.md` **§2** — verification-before-truth: alle outbound moet betrouwbaar bij de juiste klant landen. CTA's die als dode relatieve link uitkomen, breken dat principe (B2).
- **§5** — decline-flow + mail-feedback-loop. RLS-bypass in DevHub-status-update (B1) en CC-006 SECURITY DEFINER-helper (B3, B4) zijn cross-tenant-risico's die de hele communicatie-laag ondermijnen.
- `vision-ai-native-architecture.md` §6 — defense-in-depth. Drie security-lagen (middleware + Zod + RLS) moeten elk afdwingbaar zijn; B1 omzeilt RLS, B5 breekt de Zod-laag.

## Afhankelijkheden

- **CC-001 t/m CC-006** moeten gemerged zijn (zijn ze; zie `sprints/done/`).
- Geen nieuwe externe deps. Geen schema-uitbreiding (alleen migration-fix bovenop CC-006).

## Open vragen vóór start

1. **B3+B4 in één migration of twee?** Aanbeveling: **één migration `<ts>_cc007_security_definer_hardening.sql`**. Beide raken dezelfde helper, en search_path-fix + signature-refactor moeten in dezelfde RLS-policy-revisie omdat de policy de helper aanroept.
2. **B5 (kind-mismatch): "feedback" toevoegen aan `markInboxItemReadAction`-enum, of UI-laag normaliseren?** Aanbeveling: **één bron, in de validation**. Voeg `"feedback"` toe en map intern op `"issue"`. UI blijft naturlijke `item.kind`-waarde doorgeven. Backwards-compat met bestaande `"issue"`-aanroepen behouden via `z.enum(["issue","feedback","question"])`.
3. **B1 (DevHub notify zonder client): dezelfde server-client doorgeven of admin-call documenteren?** Aanbeveling: **server-client doorgeven**. Cockpit doet het zo, consistentie wint, en RLS blijft enforced.
4. **S2 (DevHub notify-trigger-coverage): nu uitbreiden of in CC-008?** Aanbeveling: **nu**. Het zit in dezelfde regels als B1, één diff. Vervang de hardcoded `["in_progress","done"]`-guard door `pickTemplateForStatus(status) !== null` zodat statussen automatisch synchroniseren.
5. **Rate-limit op klant-compose (CC-006 S2): hier of CC-008?** Aanbeveling: **hier, in een minimale vorm**. DB-count-rate-limit (max 10 root-messages per uur per `sender_profile_id`) is 15 regels code en sluit een spam-vector. Geavanceerdere middleware-laag mag in CC-008.

## Taken

Bouwvolgorde **migration → mutations/validations → actions → tests**. Migration eerst omdat de helper-signature-wijziging downstream actions raakt.

### 1. Migration: SECURITY DEFINER-hardening (CC-006 follow-up)

Pad: `supabase/migrations/<timestamp>_cc007_security_definer_hardening.sql`.

```sql
-- Fix B3: pin search_path inclusief pg_catalog
-- Fix B4: helper accepteert geen willekeurige user_id meer (oracle-vector dicht)
DROP FUNCTION IF EXISTS client_question_reply_visible(uuid, uuid);

CREATE FUNCTION client_question_reply_visible(parent uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM client_questions cq
    JOIN portal_project_assignments ppa ON ppa.project_id = cq.project_id
    WHERE cq.id = parent
      AND ppa.profile_id = auth.uid()
  );
$$;

REVOKE EXECUTE ON FUNCTION client_question_reply_visible(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION client_question_reply_visible(uuid) TO authenticated;

-- Update RLS-policy om de nieuwe signature te gebruiken
DROP POLICY IF EXISTS "klant ziet replies via helper" ON client_questions;
CREATE POLICY "klant ziet replies via helper" ON client_questions
  FOR SELECT TO authenticated
  USING (
    parent_id IS NOT NULL
    AND is_client(auth.uid())
    AND client_question_reply_visible(parent_id)
  );

-- Pas `is_client` en `has_portal_access` ook aan (consistentie + zelfde hijack-vector)
ALTER FUNCTION is_client(uuid) SET search_path = pg_catalog, public;
ALTER FUNCTION has_portal_access(uuid, uuid) SET search_path = pg_catalog, public;

COMMENT ON POLICY "klant ziet replies via helper" ON client_questions IS
  'CC-007: helper neemt geen user_id parameter meer; gebruikt auth.uid() intern. Voorkomt boolean-oracle.';
```

**Verifieer in Supabase SQL editor:**

```sql
-- Mag NIET werken vanuit klant-sessie:
SELECT client_question_reply_visible('<andere-user-uuid>'); -- old signature, error

-- Mag wel werken (returnt true/false op eigen access):
SELECT client_question_reply_visible('<parent-id>');
```

### 2. Validation-fix B5: kind-mismatch

Pad: `apps/cockpit/src/features/inbox/actions/mark-read.ts:18` + downstream.

```ts
// VOOR:
kind: z.enum(["issue", "question"]),

// NA:
kind: z.enum(["issue", "feedback", "question"]),
// ... in body:
const dbKind = parsed.kind === "feedback" ? "issue" : parsed.kind;
await markInboxItemRead({ kind: dbKind, ... });
```

Voeg unit-test in `apps/cockpit/__tests__/features/inbox/actions/mark-read.test.ts` die alle drie de kind-waardes accepteert en correct mapt.

### 3. RLS-bypass-fix B1: DevHub notify krijgt server-client

Pad: `apps/devhub/src/features/issues/actions/issues.ts:204`.

```ts
// VOOR:
notifyFeedbackStatusChanged(updated, updated.status as IssueStatus);

// NA:
const supabase = await createServerClient(); // bestaat al in dit bestand of importeer
await notifyFeedbackStatusChanged(updated, updated.status as IssueStatus, supabase);
```

Tegelijk **S2 oplossen** (notify-trigger-coverage):

```ts
// VOOR:
if (oldStatus !== updated.status && ["in_progress", "done"].includes(updated.status)) {
  notifyFeedbackStatusChanged(...);
}

// NA:
if (oldStatus !== updated.status && pickTemplateForStatus(updated.status) !== null) {
  await notifyFeedbackStatusChanged(updated, updated.status as IssueStatus, supabase);
}
```

Test in `apps/devhub/__tests__/actions/issues-notify.test.ts` uitbreiden: assertie dat `supabase` (cookie-client, niet admin) als 3e arg gaat, en dat `triage`/`declined`/`deferred` óók notify triggeren.

### 4. Mail-CTA-fix B2: fail-loud bij missend portalUrl

Pad: `packages/notifications/src/notify/{feedback-status,question-reply,new-team-message}.ts`.

```ts
// VOOR:
const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL;
const ctaUrl = `${portalUrl ?? ""}/projects/${projectId}/feedback/${issueId}`;

// NA — in elk notify-bestand bovenaan:
const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL;
if (!portalUrl) {
  console.error("[notify] NEXT_PUBLIC_PORTAL_URL ontbreekt — mail wordt niet verstuurd");
  return { ok: false, reason: "missing-portal-url" };
}
const ctaUrl = `${portalUrl}/projects/${projectId}/feedback/${issueId}`;
```

Optioneel: trek de check op in een shared helper `requirePortalUrl()` in `packages/notifications/src/client.ts`.

### 5. Promise.allSettled in notify-orchestrators

Pad: alle drie `notify/*.ts` bestanden.

```ts
// VOOR:
await Promise.all(recipients.map(r => sendMail({...})));

// NA:
const results = await Promise.allSettled(recipients.map(r => sendMail({...})));
const failed = results.filter(r => r.status === "rejected");
if (failed.length > 0) {
  console.error("[notify] partial failure", { failedCount: failed.length, total: results.length });
}
```

### 6. Rate-limit op klant-compose (CC-006 S2, minimaal)

Pad: `apps/portal/src/actions/inbox.ts` in `sendMessageAsClientAction`.

```ts
// Vóór de mutation, na auth-check:
const recentCount = await countClientRootMessagesInLastHour(profile.id, supabase);
if (recentCount >= 10) {
  return {
    error: "Je hebt veel berichten verstuurd in het laatste uur. Probeer het later opnieuw.",
  };
}
```

Nieuwe query-helper in `packages/database/src/queries/client-questions.ts`:

```ts
export async function countClientRootMessagesInLastHour(
  profileId: string,
  client?: SupabaseClient,
): Promise<number> { ... }
```

Test: integration-test (`describeWithDb`) die 11 messages probeert binnen een uur en verifieert dat de 11e geweigerd wordt.

### 7. PostgREST embed-syntax verwijderen (CC-001 should-fix)

Pad: `packages/database/src/mutations/issues/pm-review.ts:122`.

```ts
// VOOR (FIX-TH-914 cautionary tale):
.select("project_id, projects!inner(organization_id), status")

// NA:
const { data: issue } = await client.from("issues")
  .select("project_id, status")
  .eq("id", issueId).single();
const { data: project } = await client.from("projects")
  .select("organization_id")
  .eq("id", issue.project_id).single();
```

Geen test-wijziging nodig (gedrag identiek), maar voeg comment toe waarom de embed-syntax vermeden wordt (link naar TH-914).

### 8. CC-005 revalidatePath-bug

Pad: `apps/cockpit/src/features/inbox/actions/preferences.ts:31`.

```ts
// VOOR:
revalidatePath("/(dashboard)", "layout");

// NA:
revalidatePath("/", "layout");
```

(Of expliciet `revalidatePath("/inbox")` + `revalidatePath("/projects/[id]/inbox", "page")` als dat preciezer is.)

### 9. Tests

- **B3/B4 migration:** integration-test in `packages/database/__tests__/rls/cc007-helper-hardening.test.ts` — klant A kan met de nieuwe helper-signature géén oracle-query meer doen op user B's reply-visibility.
- **B5:** unit-test op `markInboxItemReadAction` voor alle drie kinds.
- **B1:** mock-test op `notifyFeedbackStatusChanged` capture van 3e arg = supabase-client (niet undefined).
- **B2:** unit-test op `notify/*.ts` zonder env-var → returnt `{ok: false, reason: "missing-portal-url"}` en stuurt geen mail.
- **Rate-limit (taak 6):** zie hierboven.
- **Promise.allSettled (taak 5):** mock 1-van-3 recipients faalt, verifieer dat de 2 anderen wél zijn aangeroepen.

### 10. Docs

- Update `packages/notifications/README.md` met de nieuwe `requirePortalUrl`-fail-loud-gedrag + rate-limit policy klant-side.
- Update `apps/cockpit/src/features/inbox/README.md` met kind-mapping (feedback ↔ issue).
- Voeg note toe in `docs/specs/vision-customer-communication.md` §5 over rate-limit (10/uur) — relevant voor klant-verwachting.
- Verplaats deze sprint naar `sprints/done/` na merge en update `sprints/backlog/README.md`.

## Acceptatiecriteria

- [ ] Migration `cc007_security_definer_hardening` toegepast en lokaal + preview-Supabase getest. Oude signature `client_question_reply_visible(uuid, uuid)` bestaat niet meer.
- [ ] `is_client`, `has_portal_access`, `client_question_reply_visible` hebben allemaal `search_path = pg_catalog, public`.
- [ ] Klant-RLS-test: klant A kan reply-visibility van klant B niet bevragen via directe RPC.
- [ ] `markInboxItemReadAction` accepteert `"issue" | "feedback" | "question"`; URL-link in `inbox-row.tsx` werkt zonder validatie-error.
- [ ] DevHub `notifyFeedbackStatusChanged` krijgt cookie-client mee; test asserteert dat het géén admin-client is.
- [ ] DevHub status-update naar `triage|declined|deferred|converted_to_qa` triggert óók notify (via `pickTemplateForStatus`).
- [ ] Notify-bestanden zonder `NEXT_PUBLIC_PORTAL_URL` returneren `{ok: false}` + console.error; geen relatieve CTA's meer in mails.
- [ ] Notify-orchestrators gebruiken `Promise.allSettled`; één falende recipient breekt de andere niet.
- [ ] Klant kan max 10 root-messages per uur posten; 11e wordt geweigerd met user-friendly error.
- [ ] PostgREST `projects!inner(...)`-embed verwijderd uit `pm-review.ts`; vervangen door losse lookup.
- [ ] `preferences.ts` `revalidatePath` gebruikt valide URL-pad; onboarding-card verdwijnt direct na dismiss.
- [ ] `npm run type-check`, `npm run lint`, `npm test`, `npm run check:queries`, `npm run check:features`, `npm run check:readmes` allemaal groen.
- [ ] CC-007 rij toegevoegd aan `sprints/backlog/README.md`.

## Risico's

| Risico                                                                                                                          | Mitigatie                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Migration breekt bestaande `client_question_reply_visible(uuid,uuid)`-callers (zou er niet moeten zijn buiten RLS-policy zelf). | `grep -r "client_question_reply_visible" supabase/ packages/ apps/` vóór merge; alleen policy-aanroep verwacht.                                                                                                                                                 |
| Rate-limit-query (taak 6) doet één extra DB-call per klant-message.                                                             | Acceptabel: een count met index op `(sender_profile_id, parent_id, created_at)` is snel. Bij volume-zorgen later naar Redis.                                                                                                                                    |
| `pickTemplateForStatus` returnt `null` voor onverwachte status → notify wordt geskipt waar voorheen gestuurd.                   | Geverifieerd in tests (taak 9 covereert alle statussen). De huidige hardcoded `["in_progress","done"]` is een subset, dus dit kan alleen méér mails veroorzaken, niet minder. Klant kan eerder verbaasd zijn — controleer template-tone op `triage`/`deferred`. |
| `revalidatePath("/", "layout")` is duur (CC-001 nit #13 noemt het).                                                             | Acceptabel als minimal-fix in CC-007; CC-008 mag het preciezer maken.                                                                                                                                                                                           |
| Rate-limit van 10/uur kan een legitieme power-user blokkeren.                                                                   | Drempel is conservatief; meet via logs. Pas aan op basis van data, niet vooraf.                                                                                                                                                                                 |

## Niet in scope (komt in CC-008)

- README-drift fixes (`check:readmes` failures voor onboarding-card, preferences, project-tabs, topic-editors).
- Splitsen van `packages/database/src/queries/issues/core.ts` (>500 regels, cluster-drift).
- Splitsen van `packages/database/src/queries/inbox.ts` (439 regels, twijfelzone).
- Inbox-page filter naar DB (`inbox-page.tsx:42,54-73`).
- Pagination op `listInboxItemsForTeam`.
- Project-naam i.p.v. UUID-prefix in inbox-row.
- `getQuestionById` redundante DB-call in `replies.ts`.
- Compose-modal UX (autofocus, ESC-close, project-bevestiging).
- `source-badge` ↔ `source-dot` consolidatie naar `@repo/ui`.
- UTF-16 surrogate slice-bug (preview-cut op emoji's).
- DRY: `messageBodySchema` op één plek.
- Exhaustive `default: never` in switches.
- `vitest.config.ts passWithNoTests: true` opruimen.
- Test data-leak-risk in `__tests__/queries/issues.test.ts` (hardcoded c00x UUIDs).
- Ontbrekende `cc006-client-root.test.ts` RLS-integration.
- Ontbrekende `issues-pm-review-non-regression.test.ts` (CC-001 spec).
- Cockpit/portal `error.tsx` zonder error-prop logging.
- DevHub `search-input.tsx` lint-error (pre-existing, geen CC-scope).
