import { renderLayout, renderText, escapeHtml } from "./_layout";
import { projectDeeplink, type RenderedMail } from "./types";

/**
 * Notificatie voor een gebruiker die zojuist portal-toegang heeft gekregen
 * tot een project, maar al een account had (bestaande klant, member of admin).
 * Voor fresh users stuurt Supabase Auth zelf de invite-mail met magic link;
 * deze template is dus alleen voor het bestaande-user-pad in
 * `inviteProjectClientAction` en `grantMemberPortalAccessAction`.
 *
 * Geen invite-link nodig — de ontvanger heeft al een account en logt in via
 * de gewone OTP-flow op `${portalUrl}/login`.
 */
export interface PortalAccessGrantedTemplateProps {
  projectId: string;
  /** Mensleesbare projectnaam; valt terug op "een nieuw project" als null. */
  projectName: string | null;
  portalUrl: string;
}

export function portalAccessGrantedTemplate({
  projectId,
  projectName,
  portalUrl,
}: PortalAccessGrantedTemplateProps): RenderedMail {
  const url = projectDeeplink(portalUrl, projectId);
  const name = projectName?.trim() || "een nieuw project";
  const subject = `Je hebt toegang tot ${name} in het portaal`;

  return {
    subject,
    html: renderLayout({
      title: subject,
      preheader: `Bekijk de voortgang van ${name} in het Jouw AI Partner-portaal.`,
      bodyHtml: `<p style="margin:0 0 12px 0;">Hoi,</p>
<p style="margin:0 0 12px 0;">Je hebt zojuist toegang gekregen tot het project <strong>${escapeHtml(name)}</strong> in het Jouw AI Partner-portaal.</p>
<p style="margin:0 0 12px 0;">In het portaal zie je de voortgang, geef je feedback en stel je vragen aan het team.</p>
<p style="margin:0;">Inloggen gaat met je e-mailadres — je ontvangt dan een 6-cijferige code.</p>`,
      ctaUrl: url,
      ctaLabel: "Open project",
    }),
    text: renderText({
      title: subject,
      body: `Je hebt zojuist toegang gekregen tot het project ${name} in het Jouw AI Partner-portaal. In het portaal zie je de voortgang, geef je feedback en stel je vragen aan het team. Inloggen gaat met je e-mailadres — je ontvangt dan een 6-cijferige code.`,
      ctaLabel: "Open project",
      ctaUrl: url,
    }),
  };
}
