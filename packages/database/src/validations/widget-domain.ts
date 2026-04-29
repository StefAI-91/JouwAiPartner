import { z } from "zod";

/**
 * Domein-string voor de widget-whitelist. Strikt: alleen hostname, geen
 * protocol, geen pad, geen port. Lowercase normalisatie zodat
 * `Cockpit.Jouw-AI-Partner.NL` en `cockpit.jouw-ai-partner.nl` als één
 * entry tellen.
 *
 * Regex laat alleen labels toe die met letter/cijfer beginnen+eindigen,
 * dot-gescheiden, met optionele hyphens binnen labels. Geen punycode-
 * validatie — Supabase pakt UTF-8 prima maar klanten moeten zelf hun
 * IDN naar ASCII vertalen.
 */
const DOMAIN_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

export const widgetDomainSchema = z
  .string()
  .trim()
  .min(3, "Domein is te kort")
  .max(253, "Domein is te lang")
  .transform((value) => value.toLowerCase())
  .refine((value) => DOMAIN_REGEX.test(value), {
    message: "Voer alleen een hostname in (bijv. app.klant.nl, geen protocol of pad).",
  });

export const addWidgetDomainSchema = z.object({
  projectId: z.string().uuid(),
  domain: widgetDomainSchema,
});

export const removeWidgetDomainSchema = z.object({
  projectId: z.string().uuid(),
  domain: z.string().trim().min(1).max(253),
});

export type AddWidgetDomainInput = z.input<typeof addWidgetDomainSchema>;
export type RemoveWidgetDomainInput = z.input<typeof removeWidgetDomainSchema>;
