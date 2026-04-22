import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getThemeBySlug } from "@repo/database/queries/themes";

export const dynamic = "force-dynamic";

/**
 * TH-004 placeholder voor de theme-detail page. De echte pagina met header +
 * 5 tabs (Overzicht / Meetings / Besluiten / Open vragen / Mensen) + edit-
 * mode komt in TH-005. Voor nu: zodra je op een pill of donut-segment klikt
 * land je hier op een nette "komt eraan"-pagina, niet op een 404.
 *
 * We tonen wél de header-info (emoji, naam, beschrijving) zodat de landing
 * al iets nuttigs meegeeft en duidelijk is wélk thema je hebt aangeklikt.
 * 404-gedrag blijft voor onbekende slugs — de pill in de strip wordt immers
 * alleen gerenderd als er een DB-rij is.
 */
export default async function ThemeDetailPlaceholderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const theme = await getThemeBySlug(slug);
  if (!theme) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 lg:px-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Terug naar dashboard
      </Link>
      <header className="flex items-start gap-4">
        <span className="text-4xl leading-none" aria-hidden="true">
          {theme.emoji}
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{theme.name}</h1>
          <p className="mt-1 max-w-xl text-[14px] text-muted-foreground">{theme.description}</p>
          <p className="mt-3 font-mono text-[11px] text-muted-foreground/70">
            Status: {theme.status} · {theme.mention_count} mentions totaal
          </p>
        </div>
      </header>
      <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-6">
        <h2 className="text-[15px] font-semibold text-foreground">Komt in TH-005</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          De detail-pagina met 5 tabs (overzicht, meetings met evidence-quotes, besluiten, open
          vragen, mensen) + edit-mode voor matching_guide wordt in de volgende sprint gebouwd. Voor
          nu zie je alleen de header-info — pills en donut navigeren hier wel correct naartoe.
        </p>
      </div>
    </div>
  );
}
