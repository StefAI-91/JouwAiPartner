# Micro Sprint WG-006: Screenshot-bijlage in widget-feedback

## Doel

Gebruiker kan bij feedback een screenshot van de huidige pagina meesturen. Userback-parity-feature die het meest gemist wordt sinds cutover. Geen annotaties (tekenen/highlights) — preview only, MVP. Screenshot landt als `issue_attachments`-rij van type `screenshot`, DevHub triage rendert hem al automatisch via de bestaande UI van de Userback-tijd.

## Probleem

Sinds Userback eruit ging missen we het visuele bewijs bij bug-rapporten. Triage moet vaker terug naar de melder voor "kun je een screenshot sturen?" — friction die we kunnen wegnemen door html2canvas in de widget zelf.

## Scope-keuzes (vooraf gemaakt)

- **Capture:** `html2canvas` (DOM→canvas), niet `getDisplayMedia()`. Geen permission-prompt, matchen Userback-UX.
- **Geen annotaties** — alleen preview + verwijderen. Tekenen/rechthoek/labels zijn een follow-up sprint (WG-009 gepland) als triage zegt het nodig te hebben.
- **Lazy bundle** — `widget-screenshot.js` apart, geladen bij eerste klik op "Screenshot toevoegen". Houdt baseline `widget.js` op de huidige 11 KB gzip; html2canvas (~30 KB gzip) zit in een aparte chunk.
- **Opslag:** hergebruikt bestaande `issue-attachments` Supabase-bucket en `issue_attachments`-tabel. Geen nieuwe migratie.
- **Bestandsformaat:** JPEG quality 0.7 op max 1280px breed. Compressie houdt payload <500 KB. PNG zou 2-5× groter zijn voor weinig winst op een DOM-screenshot.

## Requirements

| ID         | Beschrijving                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WG-REQ-150 | Esbuild config: derde build-target `apps/widget/src/widget/screenshot.tsx` → `public/widget-screenshot.js`. IIFE format, geen `globalName` (lesson WG-007). Bundeltje doet `window.__JAIPWidgetScreenshot = { capture(): Promise<{dataUrl, width, height}> }`.                                                                                                                                                              |
| WG-REQ-151 | `apps/widget` dep `html2canvas@^1.4.1`. Alleen ge-bundeld in `widget-screenshot.js`, niet in `widget.js`. Verifieerbaar via gzip-budget.                                                                                                                                                                                                                                                                                    |
| WG-REQ-152 | Capture-helper: html2canvas op `document.documentElement`, daarna canvas resize naar max 1280px breed met `OffscreenCanvas` (fallback naar regular canvas), `toDataURL("image/jpeg", 0.7)`. Returnt `{ dataUrl, width, height }`.                                                                                                                                                                                           |
| WG-REQ-153 | Modal UI: knop "Screenshot toevoegen" zichtbaar in idle/error state, niet bij submit/success. Eerste klik triggert lazy-load `widget-screenshot.js`. Tijdens capture: knop disabled + spinner. Na capture: thumbnail-preview + verwijder-knop.                                                                                                                                                                              |
| WG-REQ-154 | Submit-payload uitgebreid met optioneel `screenshot: { data_url, width, height } \| null`. `data_url` valideert als `string` startend met `data:image/jpeg;base64,` en max 700.000 chars (≈ 525 KB binary).                                                                                                                                                                                                                 |
| WG-REQ-155 | Ingest-route: na succesvolle `insertWidgetIssue` upload screenshot data URL naar `issue-attachments` bucket onder `widget/{issue_id}/screenshot.jpg`, dan `INSERT issue_attachments` met `type='screenshot'`, `file_name='screenshot.jpg'`, `mime_type='image/jpeg'`, `storage_path`, `file_size`, `width`, `height`. Failures bij upload mogen het issue NIET stuk maken — log een warn, return success op het issue zelf. |
| WG-REQ-156 | Helper `uploadScreenshotDataUrl(issueId, dataUrl, width, height, client?)` in `packages/database/src/mutations/issues/attachments.ts`. Decode base64 naar Uint8Array, upload via service-role client, insert attachment-row.                                                                                                                                                                                                |
| WG-REQ-157 | Build-guards uitgebreid: `check-bundle-globals.mjs` valideert ook `widget-screenshot.js` (eist `window.__JAIPWidgetScreenshot=`, geen var-shadow). `check-bundle-size.mjs` heeft budget voor de nieuwe bundle (max 35 KB gzip).                                                                                                                                                                                             |
| WG-REQ-158 | Vitest unit-test `screenshot-bundle-binding.test.ts` — zelfde JSDOM script-tag patroon als WG-007's `bundle-binding.test.ts`. Assert `window.__JAIPWidgetScreenshot.capture` is een function.                                                                                                                                                                                                                               |
| WG-REQ-159 | Lokale smoke-test: cockpit dev + lokale widget-server met override → klik feedback → screenshot toevoegen → preview ziet eruit als verwacht → submit → DevHub triage detail-page toont de screenshot inline.                                                                                                                                                                                                                |
| WG-REQ-160 | `docs/ops/widget-installation-clients.md`: korte sectie "Screenshot-feature" — geen actie nodig voor klanten, automatisch beschikbaar zodra widget-bundle is geüpdatet. Eventuele CSP-impact (geen, maar wel benoemen voor het geval iemand vraagt).                                                                                                                                                                        |

## Afhankelijkheden

- **WG-007** klaar (bundle-binding-bug + build-guard) — anders zou de nieuwe screenshot-bundle dezelfde shadow-bug kunnen herhalen.
- Bestaand: `issue-attachments`-bucket (migratie 20260409200001), `issue_attachments`-tabel (20260409200002), DevHub triage `issue-attachments.tsx` rendert al `type='screenshot'`.

### Open vragen

- **Q1: html2canvas DPR-behavior op high-density displays?** Default rendert het op `window.devicePixelRatio`. Op 4K-Mac geeft dat een 7680px brede canvas, daarna resize naar 1280px. Acceptabel — resize naar 1280px is altijd goedkoop. Niet pinnen op `scale: 1`, dat geeft blurry text.
- **Q2: Cross-origin images in DOM blokkeren capture?** html2canvas faalt op cross-origin `<img>` zonder CORS. In cockpit zien we vooral first-party images, dus laag risico. Logging in capture: bij failure → `console.warn("[JAIP screenshot] cross-origin image blokkeerde rendering, screenshot mogelijk incompleet")` en lever toch op wat er is.
- **Q3: Privacy — credit cards / wachtwoorden in screenshot?** Out-of-scope nu. Userback-parity is dat het werkt; mocht een klant strict-privacy nodig hebben, dan toggle in UI om bepaalde elementen te skippen via `data-html2canvas-ignore`. Niet bouwen tot iemand vraagt.

## Taken

### 1. Screenshot-bundle entry (WG-REQ-150-152)

`apps/widget/src/widget/screenshot.tsx`:

```ts
import html2canvas from "html2canvas";

declare global {
  interface Window {
    __JAIPWidgetScreenshot?: {
      capture: () => Promise<{ dataUrl: string; width: number; height: number }>;
    };
  }
}

window.__JAIPWidgetScreenshot = {
  async capture() {
    const canvas = await html2canvas(document.documentElement, {
      logging: false,
      useCORS: true,
      // Beperk de opname tot het zichtbare viewport — een full-page
      // capture op een lange pagina kan 50MB+ worden voor compressie.
      width: window.innerWidth,
      height: window.innerHeight,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
    });
    return resizeAndEncode(canvas, 1280);
  },
};

function resizeAndEncode(source: HTMLCanvasElement, maxWidth: number) {
  const scale = Math.min(1, maxWidth / source.width);
  const w = Math.round(source.width * scale);
  const h = Math.round(source.height * scale);
  const target = document.createElement("canvas");
  target.width = w;
  target.height = h;
  const ctx = target.getContext("2d")!;
  ctx.drawImage(source, 0, 0, w, h);
  return { dataUrl: target.toDataURL("image/jpeg", 0.7), width: w, height: h };
}
```

`apps/widget/esbuild.config.mjs`: derde build-entry analoog aan widget.js, zonder globalName.

### 2. Modal UI (WG-REQ-153)

In `apps/widget/src/widget/modal.tsx`:

- State `screenshot: { dataUrl, width, height } | null`, `screenshotState: "idle" | "loading" | "ready" | "error"`.
- Knop tussen description-textarea en de submit-row; toont `Screenshot toevoegen` of bij `ready` een thumbnail + verwijder-knop.
- Lazy-load helper:

  ```ts
  let widgetScreenshotPromise: Promise<void> | null = null;
  function loadScreenshotBundle(loaderSrc: string) {
    if (widgetScreenshotPromise) return widgetScreenshotPromise;
    widgetScreenshotPromise = new Promise((res, rej) => {
      const tag = document.createElement("script");
      tag.src = loaderSrc.replace(/widget\.js(\?.*)?$/, "widget-screenshot.js");
      tag.async = true;
      tag.onload = () => res();
      tag.onerror = () => {
        widgetScreenshotPromise = null;
        rej(new Error("widget-screenshot.js failed to load"));
      };
      document.head.appendChild(tag);
    });
    return widgetScreenshotPromise;
  }
  ```

  De `loaderSrc` komt door als `config.bundleSrc` of we leiden 'm af via `document.currentScript`-pattern in de existing loader. Detail in implementatie.

- Submit-payload aanvullen met `screenshot` als de state `ready` is.

### 3. Validation + ingest-route (WG-REQ-154-156)

`packages/database/src/validations/widget.ts`:

```ts
const screenshotSchema = z.object({
  data_url: z.string().startsWith("data:image/jpeg;base64,").max(700_000),
  width: z.number().int().positive().max(4000),
  height: z.number().int().positive().max(4000),
});

export const widgetIngestSchema = z.object({
  // ... existing fields ...
  screenshot: screenshotSchema.optional().nullable(),
});
```

`packages/database/src/mutations/issues/attachments.ts` — nieuwe helper:

```ts
export async function uploadScreenshotDataUrl(
  issueId: string,
  dataUrl: string,
  width: number,
  height: number,
  client?: SupabaseClient,
) {
  const db = client ?? getAdminClient();
  const base64 = dataUrl.split(",")[1] ?? "";
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const storagePath = `widget/${issueId}/screenshot.jpg`;
  const { error: uploadErr } = await db.storage
    .from("issue-attachments")
    .upload(storagePath, bytes, { contentType: "image/jpeg", upsert: true });
  if (uploadErr) return { error: uploadErr.message };
  await insertAttachment(
    {
      issue_id: issueId,
      type: "screenshot",
      storage_path: storagePath,
      original_url: null,
      file_name: "screenshot.jpg",
      mime_type: "image/jpeg",
      file_size: bytes.byteLength,
      width,
      height,
    },
    db,
  );
  return { success: true as const };
}
```

`apps/devhub/src/app/api/ingest/widget/route.ts`: na `insertWidgetIssue`, als `parsed.data.screenshot` aanwezig, roep `uploadScreenshotDataUrl(...)` aan. Failures alleen loggen, niet de 200-respons breken.

### 4. Build-guards + tests (WG-REQ-157-158)

`apps/widget/scripts/check-bundle-globals.mjs`: loop over een lijst `[ {file: 'widget.js', global: '__JAIPWidget'}, {file: 'widget-screenshot.js', global: '__JAIPWidgetScreenshot'} ]`. Zelfde regex-checks per file.

`apps/widget/scripts/check-bundle-size.mjs`: voeg budget toe `widget-screenshot.js` 35 KB gzip.

`apps/widget/tests/unit/screenshot-bundle-binding.test.ts`: kopie van `bundle-binding.test.ts` patroon, ander pad + ander global.

### 5. Smoke + commit (WG-REQ-159-160)

- `npm run build --workspace=apps/widget` groen
- `npm test --workspace=apps/widget` groen (beide bundle-binding tests)
- Cockpit dev + lokale widget-server (`npx serve apps/widget/public -l 5173`) → klik feedback → screenshot toevoegen → preview → submit → DevHub triage toont screenshot.
- Doc-update in `widget-installation-clients.md`.
- Commit op main, push triggert Vercel deploy.

## Acceptatiecriteria

- [ ] WG-REQ-150-152: bundle bestaat, IIFE, exposes `window.__JAIPWidgetScreenshot.capture`. Build-guard groen.
- [ ] WG-REQ-153: modal toont "Screenshot toevoegen", lazy-load triggert bij eerste klik, preview rendert, verwijderen werkt.
- [ ] WG-REQ-154-156: zod schema accepteert screenshot, ingest-route uploadt + insert attachment-row, schermafbeelding zichtbaar in DevHub triage detail.
- [ ] WG-REQ-157: `check-bundle-globals.mjs` faalt bij ontbrekende `window.__JAIPWidgetScreenshot=` of bij outer var-shadow op screenshot-bundle.
- [ ] WG-REQ-158: vitest run is groen, beide bundle-binding tests bewijzen rood→groen via tijdelijke revert.
- [ ] WG-REQ-159: lokale smoke geverifieerd, screenshot zichtbaar in DevHub triage.
- [ ] WG-REQ-160: doc bijgewerkt.
- [ ] Sprint verplaatst naar `sprints/done/`, master-index in `sprints/backlog/README.md` bijgewerkt.

## Risico's

| Risico                                                        | Mitigatie                                                                                                                                                                                              |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| html2canvas faalt op cross-origin `<img>`                     | `useCORS: true`, log warning, lever de canvas op die er is. Gebruiker ziet preview, beslist zelf of het bruikbaar is.                                                                                  |
| Bundle-budget ~35 KB gzip — kantje van wat nog "klein" voelt  | Lazy-load: alleen gebruikers die op screenshot-knop klikken downloaden 'm. Baseline `widget.js` blijft 11 KB.                                                                                          |
| Storage upload faalt midden in de flow                        | Issue is al gecommit vóór de upload-poging — gebruiker krijgt success-toast, screenshot mist. Loggen als warn voor handmatige follow-up.                                                               |
| Schaal: veel screenshots vullen de `issue-attachments`-bucket | Bucket-limit 50 MB per file, geen total-limit gehandhaafd. WG-005-rate-limit (30 POSTs/uur per origin) biedt impliciete protectie. Cleanup-job voor oude widget-screenshots = aparte sprint als nodig. |

## Follow-up

- **WG-009 (gepland):** annotaties op screenshot — rechthoek/pijl/text label voor extra context. Pas bouwen wanneer triage zegt het nodig te hebben.
