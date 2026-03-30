import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Brain } from "lucide-react";
import { embedSection } from "@/lib/data/architectuur";

export function EmbeddingsCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">
              Embeddings: hoe zoeken op betekenis werkt
            </CardTitle>
            <CardDescription className="text-xs">Sprint 2</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed text-foreground">
          {embedSection.simpleExplanation}
        </p>
        <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Voorbeeld</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            De zin <em>&quot;We moeten het budget verhogen&quot;</em> en{" "}
            <em>&quot;Er is meer geld nodig&quot;</em> hebben totaal andere woorden, maar
            vergelijkbare embeddings. Het systeem begrijpt dat ze hetzelfde bedoelen.
          </p>
        </div>
        <Accordion>
          <AccordionItem>
            <AccordionTrigger className="py-2 text-xs text-muted-foreground hover:no-underline">
              Technische details
            </AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-1.5">
                {embedSection.technicalDetails.map((detail) => (
                  <li key={detail} className="text-xs leading-relaxed text-muted-foreground">
                    <span className="mr-1.5 text-primary/60">&bull;</span>
                    {detail}
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
