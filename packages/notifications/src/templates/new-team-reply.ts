import { renderLayout, renderText, escapeHtml } from "./_layout";
import { inboxDeeplink, type QuestionReplyTemplate } from "./types";

export const newTeamReplyTemplate: QuestionReplyTemplate = ({
  question,
  replyPreview,
  portalUrl,
}) => {
  const url = inboxDeeplink(portalUrl, question.project_id);
  const subject = "Je hebt een nieuw antwoord";
  const preview = replyPreview.trim();

  return {
    subject,
    html: renderLayout({
      title: subject,
      preheader: preview.slice(0, 120) || "Open je inbox in het portaal",
      bodyHtml: `<p style="margin:0 0 12px 0;">Hoi,</p>
<p style="margin:0 0 12px 0;">Het team heeft gereageerd op je vraag.</p>
${preview ? `<blockquote style="margin:0 0 12px 0;padding:12px 16px;background:#f6f6f6;border-left:3px solid #ccc;color:#333;white-space:pre-wrap;">${escapeHtml(preview)}</blockquote>` : ""}`,
      ctaUrl: url,
      ctaLabel: "Open inbox",
    }),
    text: renderText({
      title: subject,
      body: `Het team heeft gereageerd op je vraag.${preview ? `\n\n${preview}` : ""}`,
      ctaLabel: "Open inbox",
      ctaUrl: url,
    }),
  };
};
