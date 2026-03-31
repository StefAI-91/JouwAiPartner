import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { SensitivityBadge } from "@/components/architectuur/security/sensitivity-badge";
import { actionItems } from "@/app/(dashboard)/architectuur/security/_data/action-items";

export function ActionItemsCard() {
  return (
    <Card className="border-orange-200 dark:border-orange-800/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-orange-700 dark:text-orange-400">
          <Shield className="h-4 w-4" />
          Open actiepunten
        </CardTitle>
        <CardDescription>Prioriteiten voor de security baseline</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {actionItems.map(({ priority, item }) => (
            <div key={item} className="flex items-start gap-2 text-xs">
              <SensitivityBadge level={priority as "kritiek" | "hoog" | "midden"} />
              <span className="text-foreground">{item}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
