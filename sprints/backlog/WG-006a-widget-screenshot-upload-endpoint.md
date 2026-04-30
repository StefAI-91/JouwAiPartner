# Micro Sprint WG-006a: Screenshot Upload Endpoint + Token-flow

## Doel

Backend-foundation voor de screenshot-functie van de widget (WG-REQ-057, gap uit WG-003 / `widget-migration.md`). Deze sprint levert **alleen de server-kant**: een aparte upload-route die een PNG ontvangt, hem in de bestaande `issue-attachments`-bucket parkeert en een eenmalig **claim-token** teruggeeft. WG-006b (volgende sprint) bouwt de widget-UI met `html2canvas` en de claim-flow vanuit de feedback-POST. Splitsen voorkomt dat één sprint zowel een nieuwe externe lib (html2canvas, ~30KB) als een nieuw endpoint mét nieuwe security-grens introduceert — beide los testbaar maakt het reviewbaar voor de niet-coder die deze codebase maintaint.

Waarom een token en niet direct `storage_path` in de feedback-POST? Een attacker met een geldig project + Origin zou anders andermans screenshot-paden aan zijn eigen issue kunnen koppelen. Een server-uitgegeven token dat één keer geclaimd kan worden sluit dat gat (zie ook WG-001 §Security-aanpak — Origin-binding alleen is goedwillend-bestendig, niet kwaadwillend-bestendig). Token-tabel hergebruikt het `widget_rate_limits`-patroon uit WG-005: kleine tabel + pg_cron-cleanup.

## Requirements

| ID         | Beschrijving                                                                                                                                                                                                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WG-REQ-100 | Tabel `widget_screenshot_tokens (token uuid PK default gen_random_uuid(), project_id uuid not null, storage_path text not null, created_at timestamptz default now(), expires_at timestamptz default now() + interval '1 hour', claimed_at timestamptz null)`                      |
| WG-REQ-101 | RLS aan op `widget_screenshot_tokens` zonder policies → service-role-only (zelfde patroon als `widget_rate_limits` uit WG-005)                                                                                                                                                     |
| WG-REQ-102 | Index `idx_widget_screenshot_tokens_expires` op `expires_at` zodat cleanup-cron snel blijft                                                                                                                                                                                        |
| WG-REQ-103 | Mutation-helper `uploadWidgetScreenshot(projectId, file, mimeType, client?)` in `packages/database/src/mutations/widget/screenshot.ts`: upload buffer naar `issue-attachments/widget/<token>.png` via service-role, insert token-rij, return `{ token, storage_path, expires_at }` |
| WG-REQ-104 | Validatie: alleen `image/png`, max **2 MB** (raw bytes, pre-compressie) — afwijzing met `415 unsupported_media_type` resp. `413 payload_too_large`. Limieten in `packages/database/src/constants/widget.ts` zodat tweaken één edit + redeploy is                                   |
| WG-REQ-105 | Nieuwe route `POST /api/ingest/widget/screenshot` in `apps/devhub/src/app/api/ingest/widget/screenshot/route.ts`: `multipart/form-data` met velden `project_id` (uuid) en `file` (PNG)                                                                                             |
| WG-REQ-106 | Route doet zelfde Origin-whitelist-check als de feedback-route (`isOriginAllowedForProject`); 403 bij mismatch                                                                                                                                                                     |
| WG-REQ-107 | Rate-limit hergebruikt `rateLimitOrigin` uit WG-005 met **eigen prefix `screenshot_ingest`** zodat screenshots geen feedback-budget eten. Limit-waarde **10 per uur per Origin** (lager dan feedback omdat upload duurder is + screenshot zonder feedback heeft geen waarde)       |
| WG-REQ-108 | Limit-waarde via constanten-file (`WIDGET_SCREENSHOT_LIMIT_PER_HOUR`), niet hardcoded in util                                                                                                                                                                                      |
| WG-REQ-109 | CORS: identiek aan feedback-route — Origin spiegelen op POST + OPTIONS, `Access-Control-Allow-Headers: Content-Type` (multipart vereist géén custom header)                                                                                                                        |
| WG-REQ-110 | Logging analoog aan feedback-route: `type: "widget_screenshot_ingest"`, structured JSON met `project_id`, `origin`, `status`, `error_code`, `bytes`. 4xx/5xx → `console.warn`, 200 → `console.info`                                                                                |
| WG-REQ-111 | Fail-modes expliciet: storage-upload-fout → 500 + status-page-link (zelfde patroon als feedback-route bij `insert_failed`); token-insert-fout → storage-object opruimen (`storage.remove`) zodat we geen wezen-bestanden achterlaten                                               |
| WG-REQ-112 | pg_cron-job `cleanup-widget-screenshot-tokens`: dagelijks 03:00 UTC verwijdert rijen waarvan `expires_at < now() - interval '24 hours'`. Storage-cleanup zit **niet** in deze sprint (zie Risico's — pakken we in 006b mee zodra claim-flow er staat)                              |
| WG-REQ-113 | Acceptance-test (Playwright of curl-script in `apps/widget/tests/screenshot-upload.test.ts`): valid PNG → 200 + token; te grote file → 413; verkeerde mime → 415; ongeautoriseerde Origin → 403; 11e upload binnen uur → 429                                                       |
| WG-REQ-114 | Documentatie in `docs/ops/widget-migration.md`: nieuwe sectie "Screenshot upload" met endpoint-spec, limieten, en hoe te tweaken                                                                                                                                                   |

## Afhankelijkheden

- **WG-001** — `isOriginAllowedForProject` whitelist-check
- **WG-005** — `rateLimitOrigin` util + `widget_rate_limits` patroon (we hergebruiken de util met andere prefix, geen tabel-wijziging nodig)
- **Bestaand** — `issue-attachments`-bucket + `insertAttachment` helper uit `packages/database/src/mutations/issues/attachments.ts` (laatste pas in 006b gebruikt; bestaan controleren is wel nodig voor scope-zekerheid)

### Open vragen die VÓÓR deze sprint beantwoord moeten zijn

- **Q1: Token-TTL 1 uur of korter?** Aanbeveling: **1 uur**. Gebruiker neemt screenshot, typt feedback, kan onderbroken worden — 1 uur dekt realistische sessies zonder dat verlaten tokens lang blijven liggen. Te kort = boze user die "screenshot expired" ziet bij langzaam typen.
- **Q2: Storage-cleanup nu of in 006b?** Aanbeveling: **in 006b**. Onder `claimScreenshotToken` weten we welke storage-objecten _wel_ aan een issue hangen, dus dáár is een veilige diff te trekken (delete waar `claimed_at IS NULL AND expires_at < now() - 24h`). Nu cleanup in 006a optimistisch implementeren betekent storage-objecten zonder bijbehorende UI ergens parkeren = onnodige complexiteit.
- **Q3: Mime alleen PNG, of ook JPEG/WebP?** Aanbeveling: **alleen PNG** in V0. `html2canvas` levert PNG (canvas → toBlob), JPEG-conversion is extra werk in de widget en JPEG-artefacten zijn ongewenst voor UI-screenshots. WebP later als browser-matrix het toestaat.
- **Q4: Max-size 2 MB realistisch?** Aanbeveling: ja. 1920×1080 PNG full-page komt typisch op 0.5–1.5 MB. 2 MB geeft buffer voor retina/4K-schermen zonder dat één upload de pipe verzadigt. Als het knelt: één-line constant verhogen.
- **Q5: Bezwaar tegen `crypto.randomUUID` als token of liever HMAC?** Aanbeveling: **gewoon UUID** + database-row als ground truth. Token is alleen geldig als de rij bestaat én `claimed_at IS NULL` — extra HMAC-laag voegt niks toe.

## Taken

### 1. Migratie

`supabase/migrations/<timestamp>_widget_screenshot_tokens.sql`:

```sql
CREATE TABLE widget_screenshot_tokens (
  token uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '1 hour',
  claimed_at timestamptz NULL
);

CREATE INDEX idx_widget_screenshot_tokens_expires
  ON widget_screenshot_tokens(expires_at);

ALTER TABLE widget_screenshot_tokens ENABLE ROW LEVEL SECURITY;
-- Geen policies → service-role-only (zelfde patroon als widget_rate_limits)

SELECT cron.schedule(
  'cleanup-widget-screenshot-tokens',
  '0 3 * * *',
  $$DELETE FROM widget_screenshot_tokens
    WHERE expires_at < now() - interval '24 hours'$$
);
```

### 2. Constants

`packages/database/src/constants/widget.ts` (uitbreiden, niet vervangen):

```ts
export const WIDGET_RATE_LIMIT_PER_HOUR = 30; // bestaand uit WG-005
export const WIDGET_SCREENSHOT_LIMIT_PER_HOUR = 10;
export const WIDGET_SCREENSHOT_MAX_BYTES = 2 * 1024 * 1024;
export const WIDGET_SCREENSHOT_ALLOWED_MIMES = ["image/png"] as const;
export const WIDGET_SCREENSHOT_TOKEN_TTL_MS = 60 * 60 * 1000;
```

### 3. Mutation-helper

`packages/database/src/mutations/widget/screenshot.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";

const BUCKET_ID = "issue-attachments";

export interface UploadResult {
  token: string;
  storage_path: string;
  expires_at: string;
}

export async function uploadWidgetScreenshot(
  projectId: string,
  file: ArrayBuffer | Blob,
  mimeType: string,
  client?: SupabaseClient,
): Promise<UploadResult> {
  const db = client ?? getAdminClient();
  const token = crypto.randomUUID();
  const storage_path = `widget/${token}.png`;

  const { error: uploadError } = await db.storage
    .from(BUCKET_ID)
    .upload(storage_path, file, { contentType: mimeType, upsert: false });
  if (uploadError) throw new Error(`screenshot_upload_failed: ${uploadError.message}`);

  const { data, error: insertError } = await db
    .from("widget_screenshot_tokens")
    .insert({ token, project_id: projectId, storage_path })
    .select("token, storage_path, expires_at")
    .single();

  if (insertError) {
    // Wees-bestand opruimen — token-tabel is single source of truth
    await db.storage.from(BUCKET_ID).remove([storage_path]);
    throw new Error(`screenshot_token_insert_failed: ${insertError.message}`);
  }

  return data;
}
```

Plus index export in `packages/database/src/mutations/widget/index.ts`.

### 4. Route

`apps/devhub/src/app/api/ingest/widget/screenshot/route.ts`. Volg het stramien van de bestaande `/api/ingest/widget/route.ts`:

1. `Origin`-header check (geen Origin → 403)
2. `multipart/form-data` parsen via `req.formData()` — pak `project_id` (string) + `file` (Blob)
3. Validatie: `project_id` is geldige UUID; `file.size <= WIDGET_SCREENSHOT_MAX_BYTES`; `file.type ∈ WIDGET_SCREENSHOT_ALLOWED_MIMES`
4. `isOriginAllowedForProject(project_id, origin)` → 403 indien niet
5. `rateLimitOrigin(originHost, "screenshot_ingest")` — bij `!success`: 429 + `Retry-After`
6. `uploadWidgetScreenshot(project_id, file, file.type)` → 200 met `{ token, expires_at }` (storage_path **niet** terug naar client — onnodige info-leak)
7. CORS-headers op alle responses na de eerste Origin-check
8. `OPTIONS`-handler identiek aan feedback-route

### 5. Util-uitbreiding

`apps/devhub/src/lib/rate-limit.ts` accepteert al een `prefix`-arg uit WG-005 — alleen het type uitbreiden:

```ts
export async function rateLimitOrigin(
  origin: string,
  prefix: "widget_ingest" | "userback_ingest" | "screenshot_ingest" = "widget_ingest",
);
```

en `LIMIT_PER_HOUR` per prefix laten kiezen:

```ts
const LIMITS: Record<typeof prefix, number> = {
  widget_ingest: WIDGET_RATE_LIMIT_PER_HOUR,
  userback_ingest: WIDGET_RATE_LIMIT_PER_HOUR,
  screenshot_ingest: WIDGET_SCREENSHOT_LIMIT_PER_HOUR,
};
```

(Pas op: WG-005's huidige util heeft `LIMIT_PER_HOUR` als single constante. Refactor minimaal — alleen wat nodig is voor deze sprint.)

### 6. Tests

`apps/widget/tests/screenshot-upload.spec.ts` (Playwright API-test, geen browser nodig):

- valid PNG van 100KB → 200 + body bevat `token` (uuid) + `expires_at`
- 3MB PNG → 413
- 100KB JPEG → 415
- Origin niet op whitelist → 403
- Rate-limit: 10× upload werkt, 11e binnen uur → 429 met `Retry-After`

Database-state-cleanup voor en na tests (truncate `widget_screenshot_tokens` + bucket-prefix `widget/test-`).

### 7. Documentatie

`docs/ops/widget-migration.md`: voeg sectie **"Screenshot upload (WG-006a)"** toe met endpoint-spec, limieten, hoe je ze tweaket. Update de "Bekende gaps"-tabel: WG-REQ-057 status van "gepland" → "in progress (006a/006b)".

### 8. Dependency-graph regenereren

`npm run dep-graph` na alle file-wijzigingen zodat `docs/dependency-graph.md` de nieuwe mutation-helper en route bevat.

## Acceptatiecriteria

- [ ] WG-REQ-100/101/102: tabel + RLS + index aanwezig in productie-schema
- [ ] WG-REQ-103: `uploadWidgetScreenshot` returnt `{ token, storage_path, expires_at }`; faal-pad ruimt storage-object op
- [ ] WG-REQ-104: 2MB+ → 413; non-PNG → 415 (geverifieerd in Playwright-test)
- [ ] WG-REQ-105: route bestaat op pad `apps/devhub/src/app/api/ingest/widget/screenshot/route.ts`
- [ ] WG-REQ-106: ongeautoriseerde Origin → 403 (zelfde whitelist-pad als feedback-route)
- [ ] WG-REQ-107/108: rate-limit met prefix `screenshot_ingest`, 10/uur, constant in `widget.ts`
- [ ] WG-REQ-109: CORS-preflight slaagt vanuit cockpit (test met `curl -X OPTIONS`)
- [ ] WG-REQ-110: structured logs zichtbaar in Vercel-logs met `type: "widget_screenshot_ingest"`
- [ ] WG-REQ-111: fail-mode geverifieerd door token-insert tijdelijk te breken — storage-bucket bevat geen wees na faal
- [ ] WG-REQ-112: `cron.job`-tabel toont `cleanup-widget-screenshot-tokens`; manueel triggerbaar voor test
- [ ] WG-REQ-113: alle 5 Playwright-cases groen
- [ ] WG-REQ-114: migration-doc geüpdatet, gap-tabel-status veranderd
- [ ] `npm run check:queries` blijft groen
- [ ] Type-check + lint slagen
- [ ] `docs/dependency-graph.md` opnieuw gegenereerd, commit bevat de diff

## Risico's

| Risico                                                                                  | Mitigatie                                                                                                                                                                                          |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Multipart-parsing in Next.js App Router heeft edge-cases bij grote files                | `req.formData()` is native ondersteund in Node-runtime; expliciet `export const runtime = "nodejs"` zetten zodat Edge runtime niet stilletjes gekozen wordt                                        |
| Storage-objecten zonder claim blijven hangen tot 006b                                   | Geaccepteerd voor één sprint: tokens hebben TTL en de token-tabel cleanup draait al; storage-grootte komt op observability-radar bij volgende sync. Maximaal 24u × 10/uur × 2MB ≈ 480MB worst-case |
| Race tussen storage-upload en token-insert kan token zonder bestand opleveren           | Volgorde is upload → insert; bij insert-fout opruimen we storage. Bij upload-fout: geen token, geen wees                                                                                           |
| Iemand uploadt 10× max-size in één uur (20MB legitiem) — bandbreedte-spike              | Acceptabel — Vercel-egress + Supabase-storage ingest is binnen plan. Limit op 10/uur is bewust laag                                                                                                |
| `crypto.randomUUID` is niet cryptografisch sterk genoeg                                 | Niet nodig: token-validiteit komt uit DB-row, niet uit token-entropie. UUID v4 = 122 bits random = praktisch ungiessbaar                                                                           |
| Constant-file refactor uit WG-005 raakt nu twee plekken (rate-limit + screenshot-limit) | Test-suite van WG-005 dekt feedback-rate-limit-gedrag; voeg one-shot Playwright-case toe voor screenshot-rate-limit zodat regressies opvallen                                                      |
| pg_cron-job draait niet lokaal (Supabase local stack)                                   | Acceptabel — productie heeft pg_cron actief. Documenteer dat manuele cleanup (`DELETE … WHERE expires_at < …`) lokaal volstaat voor dev                                                            |

## Bronverwijzingen

- WG-001: ingest-foundation (Origin-whitelist + project_id-check)
- WG-005: rate-limit-Postgres (util + tabel-patroon)
- WG-003 §Q5: aanbeveling om screenshot uit MVP te splitsen
- `docs/ops/widget-migration.md` §Bekende gaps (WG-REQ-057)
- Supabase storage upload-API: https://supabase.com/docs/reference/javascript/storage-from-upload

## Vision-alignment

Vision §Delivery — feedback-loop is alleen waardevol als triagers genoeg context hebben om snel actie te ondernemen. Annotated screenshots verkleinen de "wat zag je precies?"-iteratie tussen klant en team. Door de upload-grens als losse, secured route te bouwen voorkomen we dat één publiek endpoint zowel data-payloads als binary-uploads moet verdedigen — kleinere security-grenzen zijn beter te reviewen voor een niet-coder die deze codebase maintaint.

## Niet in deze sprint (=WG-006b-scope)

- `html2canvas` lazy-import in widget-bundle
- "Screenshot toevoegen"-knop + preview in modal
- Feedback-POST uitbreiden met `screenshot_token`-veld
- `claimScreenshotToken`-mutation die token claimt + `insertAttachment` aanroept
- Storage-cleanup van niet-geclaimde objecten
- Bundle-budget aanpassen (waarschijnlijk widget.js van 30→35KB gzip — meten in 006b)
- Migration-doc gap-tabel: WG-REQ-057 status van "in progress" → "done"
