import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: "live" | "gepland";
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge variant={status === "live" ? "default" : "outline"}>
      {status === "live" ? "Live" : "Gepland"}
    </Badge>
  );
}
