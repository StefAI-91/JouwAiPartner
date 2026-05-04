import { z } from "zod";

/**
 * Body-schema voor `/api/ingest/widget` (WG-001). Komt van een browser-bundle
 * die op de client-app draait, dus alle velden zijn untrusted en moeten hier
 * dichtgelimiteerd worden.
 *
 * `type` mapt 1-op-1 op user-zichtbare keuzes (bug/idee/vraag) en wordt in de
 * mutation vertaald naar `ISSUE_TYPES` ('feature_request' voor 'idea', enz.).
 */
/**
 * WG-006 optionele screenshot. Data URL begrenzen tot ~525KB binary
 * (700_000 base64 chars) zodat één request niet het hele body-budget
 * verslindt. JPEG-only — bundle compresseert al naar quality 0.7 op
 * max 1280px breed; PNG zou 2-5× groter zijn voor weinig winst.
 */
const widgetScreenshotSchema = z.object({
  data_url: z.string().startsWith("data:image/jpeg;base64,").max(700_000),
  width: z.number().int().positive().max(4000),
  height: z.number().int().positive().max(4000),
});

export const widgetIngestSchema = z.object({
  project_id: z.string().uuid(),
  type: z.enum(["bug", "idea", "question"]),
  description: z.string().trim().min(10).max(10000),
  context: z.object({
    url: z.string().url(),
    viewport: z.object({
      width: z.number().int().nonnegative(),
      height: z.number().int().nonnegative(),
    }),
    user_agent: z.string().max(500),
  }),
  reporter_email: z.string().email().max(320).optional().nullable(),
  screenshot: widgetScreenshotSchema.optional().nullable(),
});

export type WidgetIngestInput = z.infer<typeof widgetIngestSchema>;
