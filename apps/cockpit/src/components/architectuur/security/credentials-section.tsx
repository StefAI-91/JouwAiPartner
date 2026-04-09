import { Card, CardContent } from "@repo/ui/card";
import { SensitivityBadge } from "@/components/architectuur/security/sensitivity-badge";
import { allCredentials } from "@/app/(dashboard)/architectuur/security/_data/credentials";

export function CredentialsSection() {
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Credentials &amp; secrets</h2>
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-2">
            {allCredentials.map((cred) => (
              <div
                key={cred.name}
                className="flex items-center gap-3 rounded-md border border-border/50 px-3 py-2"
              >
                <SensitivityBadge level={cred.risk as "kritiek" | "hoog" | "publiek"} />
                <code className="shrink-0 font-mono text-xs">{cred.name}</code>
                <span className="text-xs text-muted-foreground">{cred.description}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
