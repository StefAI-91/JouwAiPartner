import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { Database, Layout, Sparkles, GitBranch, BookUser } from "lucide-react";

const items = [
  {
    icon: Database,
    title: "projects.phase + transitielog",
    description:
      "Eén kolom op projects, plus een tabel die de fase-historie vasthoudt (wie en wanneer).",
  },
  {
    icon: Layout,
    title: "Fase-bewuste projectpagina",
    description:
      "Bovenaan een fase-strip 1→9. Per fase de juiste deliverable-card en alerts. Vervangt de huidige bron-only weergave.",
  },
  {
    icon: Sparkles,
    title: "PM Drafter-agent",
    description:
      "Sonnet-agent die op fase-overgang het juiste document drafte. Plaatst het in de review-queue, niet direct naar de klant.",
  },
  {
    icon: GitBranch,
    title: "Fase-overgangs-detector",
    description:
      "De bridge: meeting/email-classificatie + DevHub-mijlpalen → suggesties voor fase-update.",
  },
  {
    icon: BookUser,
    title: "Lead-laag in directory",
    description:
      "Orgs zonder project zijn nu tweederangs. Fase 1 vereist dat ze first-class worden, met eigen briefing.",
  },
];

export function WhatsNew() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Wat hier echt nieuw aan is</CardTitle>
        <p className="text-sm text-muted-foreground">
          Wat we moeten bouwen om de cockpit fase-bewust te maken — gerangschikt van fundament naar
          UI.
        </p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.title} className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-4 w-4 text-foreground" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{item.title}</div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
