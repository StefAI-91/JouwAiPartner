export interface CredentialEntry {
  name: string;
  risk: string;
  description: string;
}

export const allCredentials: CredentialEntry[] = [
  {
    name: "SUPABASE_SERVICE_ROLE_KEY",
    risk: "kritiek",
    description: "Volledige database-toegang, bypassed RLS",
  },
  {
    name: "FIREFLIES_API_KEY",
    risk: "hoog",
    description: "Toegang tot alle Fireflies transcripts",
  },
  {
    name: "FIREFLIES_WEBHOOK_SECRET",
    risk: "hoog",
    description: "HMAC validatie van inkomende webhooks",
  },
  {
    name: "ANTHROPIC_API_KEY",
    risk: "hoog",
    description: "Claude API toegang (kostenrisico + data-exposure)",
  },
  {
    name: "COHERE_API_KEY",
    risk: "hoog",
    description: "Cohere embedding API toegang",
  },
  {
    name: "OAUTH_SECRET",
    risk: "kritiek",
    description: "JWT signing key voor MCP OAuth tokens (HS256, min 32 chars)",
  },
  {
    name: "CRON_SECRET",
    risk: "hoog",
    description: "Bearer token voor cron/ingest endpoints (fallback voor OAUTH_SECRET)",
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_URL",
    risk: "publiek",
    description: "Supabase project URL (bewust publiek)",
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    risk: "publiek",
    description: "Supabase anon key (bewust publiek, beperkt door RLS)",
  },
];
