export interface ActionItem {
  priority: string;
  item: string;
}

export const actionItems: ActionItem[] = [
  {
    priority: "hoog",
    item: "Zod validatie toevoegen in database mutations (runtime input-validatie ontbreekt)",
  },
  {
    priority: "hoog",
    item: "Rate limiting op MCP, OAuth en webhook endpoints",
  },
  {
    priority: "hoog",
    item: "OAuth token revocation endpoint toevoegen (tokens zijn nu niet intrekbaar)",
  },
  {
    priority: "hoog",
    item: "Content Security Policy (CSP) header toevoegen",
  },
  {
    priority: "hoog",
    item: "Audit logging voor data-toegang en MCP tool calls",
  },
  {
    priority: "midden",
    item: "RLS policies activeren op alle Supabase tabellen (gepland voor v3 client portal)",
  },
  {
    priority: "midden",
    item: "MCP tools migreren van admin client naar user-scoped queries",
  },
  {
    priority: "midden",
    item: "Data retentiebeleid definieren en implementeren",
  },
  {
    priority: "midden",
    item: "OAuth auth codes migreren van in-memory naar database (persistentie bij restart)",
  },
  {
    priority: "midden",
    item: "Client registration beperken — allowlist of approval flow voor nieuwe MCP clients",
  },
  {
    priority: "midden",
    item: "Offboarding procedure: API keys roteren, data verwijderen per organisatie",
  },
];
