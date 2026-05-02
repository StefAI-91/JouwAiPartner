/**
 * Eén minimale layout voor alle templates. Inline styles — geen externe CSS,
 * geen MJML-compiler in v1. Alle templates renderen via deze helper zodat
 * branding/footer op één plek leeft.
 */

export interface LayoutOptions {
  title: string;
  bodyHtml: string;
  ctaUrl: string;
  ctaLabel: string;
  /** Optionele preview-tekst die in mailclient-inbox-preview verschijnt. */
  preheader?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderLayout(opts: LayoutOptions): string {
  const preheader = opts.preheader ? escapeHtml(opts.preheader) : "";
  return `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6f6f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;color:transparent;">${preheader}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f6;padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;padding:32px;max-width:560px;">
<tr><td>
<h2 style="margin:0 0 16px 0;font-size:20px;font-weight:600;line-height:1.3;">${escapeHtml(opts.title)}</h2>
${opts.bodyHtml}
<p style="margin:24px 0 0 0;">
<a href="${escapeHtml(opts.ctaUrl)}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">${escapeHtml(opts.ctaLabel)}</a>
</p>
<hr style="border:none;border-top:1px solid #eee;margin:32px 0 16px 0;">
<p style="margin:0;color:#666;font-size:12px;line-height:1.5;">Jouw AI Partner — automatische melding. Reageer in het portaal voor de snelste opvolging.</p>
</td></tr></table>
</td></tr></table>
</body></html>`;
}

/** Plain-text fallback helper — ondertitel + body + link. */
export function renderText(opts: {
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
}): string {
  return `${opts.title}\n\n${opts.body}\n\n${opts.ctaLabel}: ${opts.ctaUrl}\n\n— Jouw AI Partner`;
}

export { escapeHtml };
