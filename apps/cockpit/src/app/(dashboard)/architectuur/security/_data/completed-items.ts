export const completedItems: string[] = [
  "OAuth 2.1 + PKCE op MCP endpoint — externe AI-clients authenticeren via authorization code flow",
  "OAuth server metadata via /.well-known/oauth-authorization-server (discovery)",
  "Dynamic client registration (RFC 7591) — MCP clients kunnen zichzelf registreren",
  "JWT access tokens (HS256, 1 uur geldig) met PKCE S256 verificatie",
  "Dual auth op /api/mcp: OAuth Bearer token of Supabase session cookie",
  "Authenticatie op /api/mcp (Supabase user auth als fallback)",
  "/api/search en /api/ask verwijderd — functionaliteit via MCP tools",
  "CRON_SECRET verplicht voor /api/cron/* en /api/ingest/*",
  "Security headers: X-Content-Type-Options, X-Frame-Options, HSTS, Referrer-Policy",
  "Webhook HMAC-SHA256 validatie op Fireflies webhook",
  "Test endpoints geblokkeerd in productie (NODE_ENV check)",
  "Monorepo: gedeelde code gescheiden in packages (database, ai, mcp)",
];
