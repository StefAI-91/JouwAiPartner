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

/**
 * Stuurt één transactional mail via Resend.
 *
 * Dev-mode-skip: in alles behalve `NODE_ENV=production` slaan we de API-call
 * over en loggen alleen — voorkomt per-ongeluk-spam tijdens lokale dev.
 * `RESEND_FORCE_SEND=1` overrulet die skip voor staging-tests.
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
