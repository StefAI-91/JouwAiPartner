import { renderLayout, renderText, escapeHtml } from "./_layout";
import { inboxDeeplink, pickIssueTitle, type FeedbackTemplate } from "./types";

export const feedbackConvertedTemplate: FeedbackTemplate = ({ issue, portalUrl }) => {
  const title = pickIssueTitle(issue);
  const url = inboxDeeplink(portalUrl, issue.project_id);
  const subject = "We hebben hier een vraag over";
  const body = `Voordat we je verzoek oppakken hebben we wat extra info nodig. Open de inbox om de vraag te beantwoorden.`;

  return {
    subject,
    html: renderLayout({
      title: subject,
      preheader: title,
      bodyHtml: `<p style="margin:0 0 12px 0;">Hoi,</p>
<p style="margin:0 0 12px 0;">${escapeHtml(body)}</p>
<p style="margin:0 0 12px 0;color:#444;"><strong>Over:</strong> ${escapeHtml(title)}</p>`,
      ctaUrl: url,
      ctaLabel: "Beantwoord vraag",
    }),
    text: renderText({
      title: subject,
      body: `${body}\n\nOver: ${title}`,
      ctaLabel: "Beantwoord vraag",
      ctaUrl: url,
    }),
  };
};
