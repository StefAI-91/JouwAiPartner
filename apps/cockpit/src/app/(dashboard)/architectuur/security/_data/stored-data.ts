export interface StoredDataTable {
  table: string;
  description: string;
  ppiFields: string[];
  retention: string;
}

export const storedDataTables: StoredDataTable[] = [
  {
    table: "meetings",
    description: "Verwerkte meeting-transcripts",
    ppiFields: [
      "participants (namen + e-mails)",
      "transcript (volledige gesproken tekst)",
      "summary (samenvatting met mogelijk gevoelige inhoud)",
      "raw_fireflies (volledig origineel Fireflies response)",
      "verification_status, verified_by, verified_at (review metadata)",
    ],
    retention: "Onbeperkt (geen retentiebeleid)",
  },
  {
    table: "extractions",
    description: "Besluiten, actiepunten, inzichten, behoeften",
    ppiFields: [
      "content (extractie-inhoud, kan namen/bedragen bevatten)",
      "metadata (assignee, deadline, client naam)",
      "transcript_ref (exact citaat uit transcript)",
      "corrected_by, corrected_at (correctie-audit trail)",
      "verification_status, verified_by, verified_at (review metadata)",
    ],
    retention: "Onbeperkt (geen retentiebeleid)",
  },
  {
    table: "people",
    description: "Teamleden en contactpersonen",
    ppiFields: ["name", "email", "team", "role"],
    retention: "Onbeperkt (geen retentiebeleid)",
  },
  {
    table: "organizations",
    description: "Klanten, partners, leveranciers",
    ppiFields: ["name", "contact_person", "email"],
    retention: "Onbeperkt (geen retentiebeleid)",
  },
  {
    table: "profiles",
    description: "Platform-gebruikers (auth)",
    ppiFields: ["full_name", "email", "avatar_url"],
    retention: "Onbeperkt (gekoppeld aan Supabase Auth)",
  },
  {
    table: "projects",
    description: "Projecten gekoppeld aan organisaties",
    ppiFields: ["name (kan klantnaam bevatten)", "aliases (alternatieve namen)"],
    retention: "Onbeperkt (geen retentiebeleid)",
  },
  {
    table: "meeting_participants / meeting_projects",
    description: "Koppeltabellen (meeting \u2194 personen/projecten)",
    ppiFields: ["meeting_id, person_id, project_id (relatie-informatie)"],
    retention: "Onbeperkt (geen retentiebeleid)",
  },
  {
    table: "mcp_queries",
    description: "Usage tracking van MCP tool calls",
    ppiFields: ["query (zoekvragen van gebruikers)", "tool_name, user_id"],
    retention: "Onbeperkt (geen retentiebeleid)",
  },
];
