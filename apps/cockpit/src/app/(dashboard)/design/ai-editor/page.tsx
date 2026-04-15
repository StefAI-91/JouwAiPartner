import { Sparkles } from "lucide-react";
import { VariantSwitcher } from "./variant-switcher";

export const metadata = {
  title: "AI Editor — Chat style playground",
};

/**
 * Design playground for comparing AI summary editor chat styles.
 * Three variants share the same mock chat state so you can type an
 * instruction in one and see how the UX feels — then switch.
 */
export default function AiEditorPlaygroundPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10 lg:px-10">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground backdrop-blur">
          <Sparkles className="h-3 w-3" />
          Design playground · chat styles
        </div>
        <h1 className="font-heading mt-5 text-[40px] font-bold leading-[1.05] tracking-tight text-foreground lg:text-[48px]">
          Welke chat-stijl
          <br />
          <span className="text-primary">voelt het best?</span>
        </h1>
        <p className="mt-5 max-w-[720px] text-[15px] leading-[1.6] text-muted-foreground">
          Drie designs voor de AI Summary Editor, allemaal met dezelfde mock-data zodat je puur de
          UX vergelijkt. Typ iets in (probeer <em>&quot;Bas is Bas Spenkelink&quot;</em>) en wissel
          tussen varianten om te zien wat werkt.
        </p>
      </div>

      <VariantSwitcher />

      <div className="mt-10 rounded-xl border border-dashed border-border/60 bg-muted/20 px-5 py-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Probeer deze instructies</p>
        <ul className="mt-2 space-y-1 text-[13px]">
          <li>
            <code className="rounded bg-muted px-1 py-0.5 text-xs">Bas is Bas Spenkelink</code> —
            rename + factual correction, 3 diff-blocks
          </li>
          <li>
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              voeg toe dat Wouter aansluit in sprint 3
            </code>{" "}
            — addition, 1 diff-block
          </li>
          <li>Alles anders → generieke demo-diff</li>
        </ul>
      </div>
    </div>
  );
}
