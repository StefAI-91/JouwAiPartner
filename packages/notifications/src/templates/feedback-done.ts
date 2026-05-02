import { renderLayout, renderText, escapeHtml } from "./_layout";
import { feedbackDeeplink, pickIssueTitle, type FeedbackTemplate } from "./types";

export const feedbackDoneTemplate: FeedbackTemplate = ({ issue, portalUrl }) => {
  const title = pickIssueTitle(issue);
  const url = feedbackDeeplink(portalUrl, issue);
  const subject = "Klaar — bekijk wat we hebben opgeleverd";
  const body = `Je verzoek is afgerond. Bekijk het resultaat in het portaal.`;

  return {
    subject,
    html: renderLayout({
      title: subject,
      preheader: title,
      bodyHtml: `<p style="margin:0 0 12px 0;">Hoi,</p>
<p style="margin:0 0 12px 0;">${escapeHtml(body)}</p>
<p style="margin:0 0 12px 0;color:#444;"><strong>Je verzoek:</strong> ${escapeHtml(title)}</p>`,
      ctaUrl: url,
      ctaLabel: "Bekijk resultaat",
    }),
    text: renderText({
      title: subject,
      body: `${body}\n\nJe verzoek: ${title}`,
      ctaLabel: "Bekijk resultaat",
      ctaUrl: url,
    }),
  };
};
