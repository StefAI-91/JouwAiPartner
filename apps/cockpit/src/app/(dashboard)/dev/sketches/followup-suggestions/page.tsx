import { VariantA } from "./_components/variant-a";
import { VariantB } from "./_components/variant-b";

/**
 * Sketch — opvolgsuggesties redesign · varianten A, B (en C volgt).
 * Opt-out flow: AI volgt automatisch op, gebruiker kan snoozen.
 * Snooze ≠ delete — data blijft voor totaalbeeld.
 *
 * URL: /dev/sketches/followup-suggestions
 */
export default function FollowUpSuggestionsSketchPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-12 px-6 py-10">
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          🎨 MOCKUP — ter validatie · opt-out flow
        </div>
        <h1 className="text-2xl font-semibold">Opvolgsuggesties — design varianten</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          AI volgt automatisch op. Gebruiker kan items <em>snoozen</em> (niet verwijderen — data
          blijft voor het totaalbeeld). Onder &quot;Gesnoozed (n)&quot; blijven ze vindbaar en
          activeerbaar.
        </p>
      </header>

      <VariantA />
      <VariantB />

      <section className="rounded-xl border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Variant C (Compacte checklist met checkbox-as-snooze) volgt na deze batch.
      </section>
    </div>
  );
}
