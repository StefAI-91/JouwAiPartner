import { z } from "zod";

/**
 * Body-schema voor `/api/ingest/widget` (WG-001). Komt van een browser-bundle
 * die op de client-app draait, dus alle velden zijn untrusted en moeten hier
 * dichtgelimiteerd worden.
 *
 * `type` mapt 1-op-1 op user-zichtbare keuzes (bug/idee/vraag) en wordt in de
 * mutation vertaald naar `ISSUE_TYPES` ('feature_request' voor 'idea', enz.).
 */
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
});

export type WidgetIngestInput = z.infer<typeof widgetIngestSchema>;
