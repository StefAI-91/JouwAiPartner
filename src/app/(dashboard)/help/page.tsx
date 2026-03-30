import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowRight } from "lucide-react";
import { features, pipelineSteps, faqs } from "@/lib/data/help";
import { FeatureCard } from "@/components/help/feature-card";

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-12 px-4 py-16">
      {/* Header */}
      <div>
        <h1>Hoe werkt het platform?</h1>
        <p className="mt-2 text-muted-foreground">
          Overzicht van alle functies en hoe ze samenwerken.
        </p>
      </div>

      {/* Pipeline visualization */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/50 bg-muted/30">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            De Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent className="py-6">
          <div className="flex flex-wrap items-center gap-1.5">
            {pipelineSteps.map((step, i) => (
              <span key={step.label} className="flex items-center gap-1.5">
                <span className="flex flex-col items-center rounded-lg border border-border/50 bg-muted/40 px-3 py-2 transition-colors hover:border-primary/30 hover:bg-primary/5">
                  <span className="text-xs font-semibold">{step.label}</span>
                  <span className="text-[10px] text-muted-foreground">{step.sub}</span>
                </span>
                {i < pipelineSteps.length - 1 && (
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                )}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Feature cards */}
      <div>
        <h2 className="mb-5">Functies</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {features.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div>
        <h2 className="mb-5">Veelgestelde vragen</h2>
        <Card>
          <Accordion className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-sm">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>
      </div>
    </div>
  );
}
