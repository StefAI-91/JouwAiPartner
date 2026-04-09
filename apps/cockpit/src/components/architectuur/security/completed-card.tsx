import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@repo/ui/card";
import { Shield } from "lucide-react";
import { completedItems } from "@/app/(dashboard)/architectuur/security/_data/completed-items";

export function CompletedCard() {
  return (
    <Card className="border-green-200 dark:border-green-800/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-green-700 dark:text-green-400">
          <Shield className="h-4 w-4" />
          Afgerond
        </CardTitle>
        <CardDescription>Security verbeteringen doorgevoerd in v1 sprints</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {completedItems.map((item) => (
            <div key={item} className="flex items-start gap-2 text-xs">
              <span className="mt-0.5 shrink-0 text-green-600">&#10003;</span>
              <span className="text-muted-foreground">{item}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
