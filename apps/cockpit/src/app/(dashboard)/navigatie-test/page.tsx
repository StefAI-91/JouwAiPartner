import Link from "next/link";
import { ArrowRight, Layers, Link2 } from "lucide-react";
import { NavigatiePlayground } from "./navigatie-playground";

export const metadata = {
  title: "Navigatie-test — Snelkoppelingen",
};

export default function NavigatieTestPage() {
  return (
    <div className="relative mx-auto max-w-[1400px] px-6 py-10 lg:px-10">
      {/* Header */}
      <div className="mb-10 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground backdrop-blur">
            <Link2 className="h-3 w-3" />
            Snelkoppeling · zonder poespas
          </div>
          <h1 className="font-heading mt-5 text-[40px] font-bold leading-[1.05] tracking-tight text-foreground lg:text-[52px]">
            Projecten in de nav.
            <br />
            <span className="text-primary">Meer niet. Voorlopig.</span>
          </h1>
          <p className="mt-5 max-w-[640px] text-[15px] leading-[1.6] text-muted-foreground">
            Geen badges. Geen gezondheidskleuren. Geen acties-count. Alleen een klikbare lijst met
            actieve projecten — zodat je in één klik op de juiste pagina bent. Extra&apos;s voegen
            we pas toe wanneer iemand zegt: <em>dit mis ik</em>.
          </p>
        </div>

        <div className="hidden items-center gap-6 rounded-xl border border-dashed border-border/60 px-5 py-4 lg:flex">
          <div className="text-center">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
              Velden
            </div>
            <div className="font-heading mt-1 text-[13px] font-semibold text-foreground">3</div>
          </div>
          <div className="h-8 w-px bg-border/60" />
          <div className="text-center">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
              Joins
            </div>
            <div className="font-heading mt-1 text-[13px] font-semibold text-foreground">1</div>
          </div>
          <div className="h-8 w-px bg-border/60" />
          <div className="text-center">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
              AI
            </div>
            <div className="font-heading mt-1 text-[13px] font-semibold text-foreground">Geen</div>
          </div>
        </div>
      </div>

      {/* Sibling playground link */}
      <Link
        href="/navigatie-test/tiered"
        className="mb-10 flex items-center justify-between gap-4 rounded-2xl border border-primary/30 bg-primary/5 px-5 py-4 transition-colors hover:bg-primary/10"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Layers className="h-5 w-5" />
          </span>
          <div>
            <div className="text-[13px] font-semibold text-foreground">
              Nieuw — Tiered menu mock
            </div>
            <div className="text-[12px] text-muted-foreground">
              Vandaag vs. voorgesteld, met werkende ⌘K palette en avatar-menu. Klikbaar.
            </div>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
      </Link>

      <NavigatiePlayground />

      {/* Footer nota */}
      <div className="mt-16 border-t border-border/40 pt-6">
        <p className="text-[12px] leading-relaxed text-muted-foreground/80">
          De filosofie achter deze versie: <span className="font-semibold">begin klein</span>. Als
          de snelkoppelingen alleen al waarde geven (minder klikken om bij een project te komen), is
          dat genoeg. Elk extra signaal — actie-count, gezondheid, deadline — verdient pas een plek
          als je merkt dat het ontbreken je in de weg zit.
        </p>
      </div>
    </div>
  );
}
