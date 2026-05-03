import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { FileText, Wand2, Image as ImageIcon, ArrowRight, Eye } from "lucide-react";

export function MockupGeneratorConcept() {
  return (
    <Card className="border-dashed border-purple-300 bg-gradient-to-br from-purple-50/40 via-transparent to-transparent dark:border-purple-900 dark:from-purple-950/20">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
            <Wand2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Nice-to-have: PRD → Mockup-generator</CardTitle>
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                CONCEPT
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Op basis van het levend document een visuele mock genereren. Geeft de klant iets
              tastbaars vóór er een regel code is geschreven.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* De flow */}
        <div className="grid items-stretch gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
          <Step
            icon={FileText}
            label="Input"
            title="Levend PRD"
            description="Probleem + gebruikers + scope-secties uit het document"
          />
          <Arrow />
          <Step
            icon={Wand2}
            label="Generator"
            title="Mockup Drafter"
            description="Opus voor reasoning + Sonnet voor HTML/Tailwind output"
            highlight
          />
          <Arrow />
          <Step
            icon={ImageIcon}
            label="Output"
            title="Klikbare HTML-mock"
            description="Statische screens, embedded in portal, exporteerbaar als PDF"
          />
        </div>

        {/* Wat het oplevert */}
        <div className="grid gap-3 md:grid-cols-3">
          <ValueBlock
            title="Sneller akkoord"
            description="Klanten begrijpen plaatjes sneller dan PRD-tekst. Goede mock = halve discussie."
          />
          <ValueBlock
            title="Aannames testen"
            description="Een mock dwingt keuzes af die in tekst verstopt blijven (UI-flow, velden, navigatie)."
          />
          <ValueBlock
            title="Naadloos doorrollen"
            description="Bij groen licht wordt de mock de spec voor DevHub — geen losse handoff nodig."
          />
        </div>

        {/* Waarschuwingen */}
        <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-4 dark:border-purple-900 dark:bg-purple-950/30">
          <div className="flex items-start gap-2">
            <Eye className="mt-0.5 h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" />
            <div className="space-y-2 text-xs text-foreground/80">
              <div className="font-semibold text-foreground">Waarom dit een nice-to-have is</div>
              <ul className="space-y-1.5">
                <li className="flex gap-2">
                  <span className="text-purple-600 dark:text-purple-400">•</span>
                  <span>
                    <strong>Risico:</strong> klanten denken dat de mock de definitieve UX is. Moet
                    expliciet gelabeld worden als{" "}
                    <em>
                      &ldquo;mock voor scope-validatie, niet de uiteindelijke vormgeving&rdquo;
                    </em>
                    .
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-purple-600 dark:text-purple-400">•</span>
                  <span>
                    <strong>Kosten:</strong> Opus + Sonnet voor één mock kost al snel €0,50–€2. Niet
                    bij elk discovery-gesprek genereren — alleen op verzoek.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-purple-600 dark:text-purple-400">•</span>
                  <span>
                    <strong>Volgorde:</strong> bouw eerst het levend document met rijpheid-meters.
                    Pas als dat werkt is de generator een logische uitbreiding — niet andersom.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Step({
  icon: Icon,
  label,
  title,
  description,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  title: string;
  description: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border-2 p-4 ${
        highlight
          ? "border-purple-300 bg-purple-50 dark:border-purple-700 dark:bg-purple-950/40"
          : "border-border bg-background"
      }`}
    >
      <div className="flex items-center gap-2">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
            highlight ? "bg-purple-500 text-white" : "bg-muted text-foreground"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="mt-2 text-sm font-semibold">{title}</div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

function Arrow() {
  return (
    <div className="hidden items-center justify-center text-muted-foreground/50 lg:flex">
      <ArrowRight className="h-5 w-5" />
    </div>
  );
}

function ValueBlock({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="text-sm font-semibold">{title}</div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}
