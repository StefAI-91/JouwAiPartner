import { renderLayout, renderText, escapeHtml } from "./_layout";
import { feedbackDeeplink, pickIssueTitle, type FeedbackTemplate } from "./types";

/**
 * Sober — vision §5: klant ziet exact de tekst die PM heeft genoteerd,
 * geen herschrijving, geen AI-tussenstap.
 */
export const feedbackDeclinedTemplate: FeedbackTemplate = ({ issue, portalUrl }) => {
  const title = pickIssueTitle(issue);
  const url = feedbackDeeplink(portalUrl, issue);
  const subject = "Update over je verzoek";
  const reason = issue.decline_reason?.trim() ?? "";

  const reasonHtml = reason
    ? `<p style="margin:0 0 12px 0;color:#444;"><strong>Toelichting:</strong></p>
<blockquote style="margin:0 0 12px 0;padding:12px 16px;background:#f6f6f6;border-left:3px solid #ccc;color:#333;white-space:pre-wrap;">${escapeHtml(reason)}</blockquote>`
    : "";

  return {
    subject,
    html: renderLayout({
      title: subject,
      preheader: title,
      bodyHtml: `<p style="margin:0 0 12px 0;">Hoi,</p>
<p style="margin:0 0 12px 0;">We hebben je verzoek <em>${escapeHtml(title)}</em> bekeken en besloten het niet te plannen.</p>
${reasonHtml}`,
      ctaUrl: url,
      ctaLabel: "Lees uitleg",
    }),
    text: renderText({
      title: subject,
      body: `We hebben je verzoek "${title}" bekeken en besloten het niet te plannen.${reason ? `\n\nToelichting:\n${reason}` : ""}`,
      ctaLabel: "Lees uitleg",
      ctaUrl: url,
    }),
  };
};
