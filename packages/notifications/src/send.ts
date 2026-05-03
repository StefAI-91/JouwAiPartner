import { getResendClient } from "./client";

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Tag voor Resend-dashboard filtering, bv. "feedback-endorsed". */
  tag: string;
}

export type SendMailResult = { ok: true } | { ok: false; reason: string };

const BRAND_NAME = "Jouw AI Partner";

/**
 * Wrap een plain email-adres met de brand-naam zodat mailclients tonen
 * "Jouw AI Partner <team@…>" i.p.v. een kaal adres. Als de operator zelf
 * al "Naam <email>" in de env-var heeft gezet, respecteren we dat.
 */
function formatFrom(envValue: string): string {
  if (envValue.includes("<")) return envValue;
  return `${BRAND_NAME} <${envValue}>`;
}

/** Pak het email-deel uit "Naam <email>" of geef de string zelf terug. */
function extractEmail(value: string): string {
  const match = value.match(/<([^>]+)>/);
  return match ? match[1] : value;
}

/**
 * Stuurt één transactional mail via Resend.
 *
 * Dev-mode-skip: in alles behalve `NODE_ENV=production` slaan we de API-call
 * over en loggen alleen — voorkomt per-ongeluk-spam tijdens lokale dev.
 * `RESEND_FORCE_SEND=1` overrulet die skip voor staging-tests.
 *
 * Stuurt altijd een `List-Unsubscribe` mailto-header (Gmail/Yahoo bulk-spec
 * 2024) met als doel-adres de from-mailbox; afmeldverzoeken worden v1
 * handmatig door het team verwerkt.
 */
export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const isProd = process.env.NODE_ENV === "production";
  const force = process.env.RESEND_FORCE_SEND === "1";

  if (!isProd && !force) {
    console.info("[notifications] dev-mode skip", {
      to: input.to,
      subject: input.subject,
      tag: input.tag,
    });
    return { ok: true };
  }

  const client = getResendClient();
  if (!client) {
    console.warn("[notifications] RESEND_API_KEY missing — skip", { tag: input.tag });
    return { ok: false, reason: "no_api_key" };
  }

  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    console.error("[notifications] RESEND_FROM_EMAIL missing — fail loud", { tag: input.tag });
    return { ok: false, reason: "no_from_email" };
  }

  const fromHeader = formatFrom(from);
  const unsubscribeMail = extractEmail(from);

  const { error } = await client.emails.send({
    from: fromHeader,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    tags: [{ name: "category", value: input.tag }],
    headers: {
      "List-Unsubscribe": `<mailto:${unsubscribeMail}?subject=Unsubscribe>`,
    },
  });

  if (error) {
    console.error("[notifications] resend error", { tag: input.tag, error: error.message });
    return { ok: false, reason: error.message };
  }
  return { ok: true };
}
