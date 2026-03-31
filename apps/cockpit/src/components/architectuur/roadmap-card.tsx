import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/architectuur/status-badge";
import { roadmapItems } from "@/app/(dashboard)/architectuur/_data/roadmap";

export function RoadmapCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Roadmap</CardTitle>
        <CardDescription>Wat is af, wat komt er nog?</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {roadmapItems.map((item) => (
            <li key={item.sprint} className="flex items-start gap-3">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                {item.sprint.split(" ")[1]}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{item.title}</span>
                  <StatusBadge status={item.status} />
                </div>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
