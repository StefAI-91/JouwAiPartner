import { Resend } from "resend";

let client: Resend | null = null;

export function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

/** Test-only reset; module-singleton would otherwise leak between tests. */
export function __resetResendClientForTests(): void {
  client = null;
}

/**
 * CC-007 — fail-loud guard voor `NEXT_PUBLIC_PORTAL_URL`.
 *
 * Vóór CC-007 viel de notify-laag stil terug op `""` als de env-var
 * ontbrak; dat produceerde mails met relatieve CTA-links (`/projects/.../`)
 * die in de mailclient onbruikbaar zijn. We geven nu liever géén mail dan
 * een mail met dode CTA — de caller logt de skip, zodat de operator het
 * incident in Resend-dashboard niet hoeft te ontdekken.
 */
export function requirePortalUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_PORTAL_URL;
  if (!url) {
    console.error("[notifications] NEXT_PUBLIC_PORTAL_URL ontbreekt — mail wordt niet verstuurd");
    return null;
  }
  return url;
}
