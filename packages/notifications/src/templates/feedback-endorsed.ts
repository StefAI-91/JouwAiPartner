import { renderLayout, renderText, escapeHtml } from "./_layout";
import { feedbackDeeplink, pickIssueTitle, type FeedbackTemplate } from "./types";

export const feedbackEndorsedTemplate: FeedbackTemplate = ({ issue, portalUrl }) => {
  const title = pickIssueTitle(issue);
  const url = feedbackDeeplink(portalUrl, issue);
  const subject = "Je verzoek staat in de planning";
  const body = `We hebben je verzoek beoordeeld en op de planning gezet. Je kunt de status volgen in het portaal.`;

  return {
    subject,
    html: renderLayout({
      title: subject,
      preheader: title,
      bodyHtml: `<p style="margin:0 0 12px 0;">Hoi,</p>
<p style="margin:0 0 12px 0;">${escapeHtml(body)}</p>
<p style="margin:0 0 12px 0;color:#444;"><strong>Je verzoek:</strong> ${escapeHtml(title)}</p>`,
      ctaUrl: url,
      ctaLabel: "Bekijk in portal",
    }),
    text: renderText({
      title: subject,
      body: `${body}\n\nJe verzoek: ${title}`,
      ctaLabel: "Bekijk in portal",
      ctaUrl: url,
    }),
  };
};
