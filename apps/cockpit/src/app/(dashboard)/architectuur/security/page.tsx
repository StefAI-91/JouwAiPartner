import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";
import { IntegrationCard } from "@/components/architectuur/security/integration-card";
import { StoredDataSection } from "@/components/architectuur/security/stored-data-section";
import { CredentialsSection } from "@/components/architectuur/security/credentials-section";
import { CompletedCard } from "@/components/architectuur/security/completed-card";
import { ActionItemsCard } from "@/components/architectuur/security/action-items-card";
import { integrations } from "@/app/(dashboard)/architectuur/security/_data/integrations";

export default function SecurityDatamappingPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1>Security &amp; Datamapping</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Welke data raken we, wie heeft er toegang, en via welke koppelingen?
            </p>
          </div>
        </div>
      </div>

      {/* Summary card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Overzicht</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-relaxed text-foreground">
            Het platform verwerkt meeting-transcripts van klantgesprekken en interne overleggen.
            Data stroomt door <strong>5 systemen</strong>: Fireflies (bron), Anthropic Claude
            (AI-verwerking), Cohere (embeddings), Supabase (opslag, EU-Frankfurt) en ons MCP
            endpoint (toegang voor AI-clients). Alle API endpoints zijn beveiligd met authenticatie
            (Supabase auth, HMAC of Bearer token). Het MCP endpoint gebruikt{" "}
            <strong>OAuth 2.1 + PKCE</strong> voor externe AI-clients.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">5 externe integraties</Badge>
            <Badge variant="outline">7 API keys/secrets</Badge>
            <Badge variant="outline">9 database-tabellen</Badge>
            <Badge variant="outline">10 MCP tools</Badge>
            <Badge variant="outline">OAuth 2.1 + PKCE</Badge>
            <Badge variant="outline">Opslag: EU-Frankfurt</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Integration data flows */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Dataflow per integratie</h2>
        <div className="space-y-4">
          {integrations.map((integration) => (
            <IntegrationCard key={integration.name} integration={integration} />
          ))}
        </div>
      </div>

      {/* Stored data overview */}
      <StoredDataSection />

      {/* Credentials overview */}
      <CredentialsSection />

      {/* Completed items */}
      <CompletedCard />

      {/* Action items */}
      <ActionItemsCard />
    </div>
  );
}
