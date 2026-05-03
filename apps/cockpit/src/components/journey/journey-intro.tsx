import { Card, CardContent } from "@repo/ui/card";
import { Sparkles } from "lucide-react";

export function JourneyIntro() {
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
      <CardContent className="flex gap-4 p-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-base font-semibold">De cockpit als project manager</h2>
          <p className="text-sm leading-relaxed text-foreground/80">
            Een PM doet twee dingen tegelijk: hij weet <strong>waar elke klant nu zit</strong> in de
            reis, en <strong>welke deliverable nu logisch is</strong>. Vandaag is de cockpit
            bron-georiënteerd (meetings, emails, themes). Wat ontbreekt is een fase-dimensie op elk
            project.
          </p>
          <p className="text-sm leading-relaxed text-foreground/80">
            Onderstaande negen fases zijn een denkraam — geen plan, geen feature. Per fase staat:
            wanneer activeert hij, wat zou de AI moeten prepareren, welke deliverable rolt eruit, en
            waar zou dat in de cockpit landen.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
