import { renderLayout, renderText, escapeHtml } from "./_layout";
import { inboxDeeplink, type RenderedMail } from "./types";
import type { ClientQuestionRow } from "@repo/database/mutations/client-questions";

/**
 * CC-006 — Template voor team-initiated free message (vrije compose).
 * Mirror van `newTeamReplyTemplate`, maar zonder parent-context: dit is een
 * nieuwe thread, niet een reply.
 *
 * Deeplink wijst naar de conversation-detail in het portaal zodat de klant
 * direct in het verse gesprek staat.
 */
export interface NewTeamMessageTemplateProps {
  message: Pick<ClientQuestionRow, "id" | "project_id" | "body">;
  portalUrl: string;
}

export function newTeamMessageTemplate({
  message,
  portalUrl,
}: NewTeamMessageTemplateProps): RenderedMail {
  const base = inboxDeeplink(portalUrl, message.project_id);
  const url = `${base}/${message.id}`;
  const subject = "Je hebt een nieuw bericht van Jouw AI Partner";
  const preview = message.body.trim().slice(0, 200);

  return {
    subject,
    html: renderLayout({
      title: subject,
      preheader: preview.slice(0, 120) || "Open je inbox in het portaal",
      bodyHtml: `<p style="margin:0 0 12px 0;">Hoi,</p>
<p style="margin:0 0 12px 0;">Het team heeft een nieuw bericht voor je achtergelaten.</p>
${preview ? `<blockquote style="margin:0 0 12px 0;padding:12px 16px;background:#f6f6f6;border-left:3px solid #ccc;color:#333;white-space:pre-wrap;">${escapeHtml(preview)}</blockquote>` : ""}
<p style="margin:0;">Bekijk het volledige bericht in het portaal en reageer wanneer het uitkomt.</p>`,
      ctaUrl: url,
      ctaLabel: "Bekijk bericht",
    }),
    text: renderText({
      title: subject,
      body: `Het team heeft een nieuw bericht voor je achtergelaten.${preview ? `\n\n${preview}` : ""}`,
      ctaLabel: "Bekijk bericht",
      ctaUrl: url,
    }),
  };
}
