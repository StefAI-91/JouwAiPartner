import { renderLayout, renderText, escapeHtml } from "./_layout";
import { feedbackDeeplink, pickIssueTitle, type FeedbackTemplate } from "./types";

export const feedbackDeferredTemplate: FeedbackTemplate = ({ issue, portalUrl }) => {
  const title = pickIssueTitle(issue);
  const url = feedbackDeeplink(portalUrl, issue);
  const subject = "We parkeren dit voor later";
  const body = `Je verzoek is geparkeerd. We pakken het op zodra het past in de roadmap — je kunt de status volgen in het portaal.`;

  return {
    subject,
    html: renderLayout({
      title: subject,
      preheader: title,
      bodyHtml: `<p style="margin:0 0 12px 0;">Hoi,</p>
<p style="margin:0 0 12px 0;">${escapeHtml(body)}</p>
<p style="margin:0 0 12px 0;color:#444;"><strong>Je verzoek:</strong> ${escapeHtml(title)}</p>`,
      ctaUrl: url,
      ctaLabel: "Bekijk status",
    }),
    text: renderText({
      title: subject,
      body: `${body}\n\nJe verzoek: ${title}`,
      ctaLabel: "Bekijk status",
      ctaUrl: url,
    }),
  };
};
