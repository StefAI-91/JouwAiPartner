import { z } from "zod";
import { SPRINT_STATUSES } from "../queries/sprints/list";

/**
 * `delivery_week` moet een maandag zijn — week-granulariteit op
 * client-niveau afgedwongen, met een DB-CHECK als safety-net (zie
 * 20260503100000_create_sprints.sql).
 *
 * Postgres' EXTRACT(DOW FROM date) levert 1 voor maandag; JS' Date#getDay()
 * levert 1 voor maandag (0 = zondag). We accepteren `YYYY-MM-DD`-strings
 * en parsen ze naar UTC zodat tijdzone-verschuiving het oordeel niet
 * verstoort (bv. een NL-frontend die `2026-05-04` stuurt mag niet door
 * een UTC-min-2 hap als zondag tellen).
 */
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const deliveryWeekSchema = z
  .string()
  .regex(DATE_REGEX, "delivery_week moet YYYY-MM-DD zijn")
  .refine((value) => {
    const [yearStr, monthStr, dayStr] = value.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return false;
    }
    return date.getUTCDay() === 1;
  }, "delivery_week moet een maandag zijn (UTC)");

export const createSprintSchema = z.object({
  project_id: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
  delivery_week: deliveryWeekSchema,
  summary: z.string().max(500).nullable().optional(),
  client_test_instructions: z.string().max(5000).nullable().optional(),
  status: z.enum(SPRINT_STATUSES).optional(),
});
export type CreateSprintInput = z.infer<typeof createSprintSchema>;

export const updateSprintSchema = createSprintSchema
  .omit({ project_id: true })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "updateSprint vereist minstens één veld",
  });
export type UpdateSprintInput = z.infer<typeof updateSprintSchema>;
