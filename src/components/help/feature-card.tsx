import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type FeatureItem, iconMap } from "@/lib/data/help";

interface FeatureCardProps {
  feature: FeatureItem;
}

export function FeatureCard({ feature }: FeatureCardProps) {
  const { iconName, title, description, status, details } = feature;
  const Icon = iconMap[iconName];

  return (
    <Card className="group transition-colors hover:border-primary/20">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
              {Icon && <Icon className="h-4.5 w-4.5" />}
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">{title}</CardTitle>
              <CardDescription className="text-xs">{description}</CardDescription>
            </div>
          </div>
          <Badge
            variant={status === "actief" ? "default" : "secondary"}
            className="shrink-0 text-[10px] uppercase tracking-wider"
          >
            {status === "actief" && <span className="status-dot status-active mr-1.5" />}
            {status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5 text-[13px] leading-relaxed text-muted-foreground">
          {details.map((detail, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-primary/40" />
              {detail}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
