import { FlaskConical } from "lucide-react";
import { ThemeLab } from "./theme-lab";

export const metadata = {
  title: "Theme UI Lab — Voel welke werkt",
};

export default function ThemeLabPage() {
  return (
    <div className="relative mx-auto max-w-[1400px] px-6 py-10 lg:px-10">
      {/* Header */}
      <div className="mb-10 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground backdrop-blur">
            <FlaskConical className="h-3 w-3" />
            Prototype · voor Stef & Wouter
          </div>
          <h1 className="font-heading mt-5 text-[40px] font-bold leading-[1.05] tracking-tight text-foreground lg:text-[52px]">
            19 manieren om thema&apos;s te
            <br />
            <span className="text-primary">voelen, niet alleen zien.</span>
          </h1>
          <p className="mt-5 max-w-[680px] text-[15px] leading-[1.6] text-muted-foreground">
            Alle ideeën voor de theme-UI naast elkaar, met dezelfde sample-data. Scroll en klik
            rustig door — bij elke variant staat wat je kunt bijstellen. Kies drie die het beste
            voelen, de rest gooien we weg.
          </p>
        </div>

        <div className="hidden items-center gap-6 rounded-xl border border-dashed border-border/60 px-5 py-4 lg:flex">
          <div className="text-center">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
              Secties
            </div>
            <div className="font-heading mt-1 text-[13px] font-semibold text-foreground">4</div>
          </div>
          <div className="h-8 w-px bg-border/60" />
          <div className="text-center">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
              Varianten
            </div>
            <div className="font-heading mt-1 text-[13px] font-semibold text-foreground">19</div>
          </div>
          <div className="h-8 w-px bg-border/60" />
          <div className="text-center">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
              Data
            </div>
            <div className="font-heading mt-1 text-[13px] font-semibold text-foreground">Mock</div>
          </div>
        </div>
      </div>

      <ThemeLab />

      {/* Footer */}
      <div className="mt-20 border-t border-border/40 pt-6">
        <p className="text-[12px] leading-relaxed text-muted-foreground/80">
          Dit is een schetspagina. Data is verzonnen maar consistent. Niks hiervan leeft in de echte
          database. Als je een variant kiest, bouwen we die volgende sprint met echte data en de{" "}
          <code className="rounded bg-muted px-1 py-0.5">themes</code> tabel erachter.
        </p>
      </div>
    </div>
  );
}
