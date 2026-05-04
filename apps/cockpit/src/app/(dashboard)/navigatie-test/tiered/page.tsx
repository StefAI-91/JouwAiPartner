import { Layers } from "lucide-react";
import { TieredPlayground } from "./tiered-playground";

export const metadata = {
  title: "Navigatie-test — Tiered menu",
};

export default function TieredNavigationTestPage() {
  return (
    <div className="relative mx-auto max-w-[1400px] px-6 py-10 lg:px-10">
      {/* Header */}
      <div className="mb-10 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground backdrop-blur">
            <Layers className="h-3 w-3" />
            Tiered menu · mock
          </div>
          <h1 className="font-heading mt-5 text-[40px] font-bold leading-[1.05] tracking-tight text-foreground lg:text-[52px]">
            Vijf items in de rail.
            <br />
            <span className="text-primary">De rest één toetsaanslag weg.</span>
          </h1>
          <p className="mt-5 max-w-[640px] text-[15px] leading-[1.6] text-muted-foreground">
            Drie lagen. Daily drivers blijven zichtbaar. Bronnen vouwen we in. Setup verhuist naar
            een avatar-menu rechtsboven. <em>Alles</em> blijft bereikbaar via{" "}
            <kbd className="rounded border border-border/60 bg-muted px-1.5 py-0.5 font-mono text-[11px]">
              ⌘K
            </kbd>
            . Klik in de mock hieronder om het te voelen.
          </p>
        </div>

        <div className="hidden items-center gap-6 rounded-xl border border-dashed border-border/60 px-5 py-4 lg:flex">
          <div className="text-center">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
              Vandaag
            </div>
            <div className="font-heading mt-1 text-[13px] font-semibold text-foreground">
              11 items
            </div>
          </div>
          <div className="h-8 w-px bg-border/60" />
          <div className="text-center">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
              Voorgesteld
            </div>
            <div className="font-heading mt-1 text-[13px] font-semibold text-foreground">
              5 items
            </div>
          </div>
          <div className="h-8 w-px bg-border/60" />
          <div className="text-center">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
              Verloren
            </div>
            <div className="font-heading mt-1 text-[13px] font-semibold text-foreground">0</div>
          </div>
        </div>
      </div>

      <TieredPlayground />

      <div className="mt-16 border-t border-border/40 pt-6">
        <p className="text-[12px] leading-relaxed text-muted-foreground/80">
          Filosofie: een sidebar is een{" "}
          <span className="font-semibold">werkomgeving, geen sitemap</span>. Wat je vandaag pakt
          hoort visueel; wat je <em>kunt</em> bereiken hoort vindbaar — niet allebei zichtbaar. De
          tiering hier is een hypothese: voel het een week, en we passen aan op basis van wat
          schuurt.
        </p>
      </div>
    </div>
  );
}
