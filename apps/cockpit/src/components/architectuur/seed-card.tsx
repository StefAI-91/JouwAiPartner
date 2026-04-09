import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@repo/ui/card";
import { seedSection } from "@/app/(dashboard)/architectuur/_data/seed";

export function SeedCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Voorgeladen data</CardTitle>
        <CardDescription>{seedSection.simpleExplanation}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {seedSection.data.map((group) => (
            <div
              key={group.category}
              className="rounded-lg border border-border/50 bg-muted/30 p-3"
            >
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">{group.category}</p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item} className="text-xs text-foreground">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
