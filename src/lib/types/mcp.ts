export interface McpPersonRow {
  id: string;
  name: string;
  email: string | null;
  team: string | null;
  role: string | null;
}

export interface McpOrganizationRow {
  id: string;
  name: string;
  aliases: string[] | null;
  type: string | null;
  contact_person: string | null;
  email: string | null;
  status: string | null;
}

export interface McpProjectRow {
  id: string;
  name: string;
  aliases: string[] | null;
  status: string | null;
  organization: { name: string } | null;
}

export interface McpMeetingRow {
  id: string;
  title: string | null;
  date: string | null;
  participants: string[] | null;
  summary: string | null;
  meeting_type: string | null;
  party_type: string | null;
  relevance_score: number | null;
  organization: { id: string; name: string } | null;
  unmatched_organization_name: string | null;
  project: { id: string; name: string } | null;
}

export interface McpExtractionRow {
  id: string;
  type: string;
  content: string;
  confidence: number | null;
  transcript_ref: string | null;
  metadata: Record<string, unknown> | null;
  corrected_by: string | null;
  corrected_at: string | null;
  created_at: string | null;
  meeting_id: string | null;
  meeting: { id: string; title: string; date: string | null } | null;
}

export interface McpDecisionRow {
  id: string;
  content: string;
  confidence: number | null;
  transcript_ref: string | null;
  metadata: Record<string, unknown> | null;
  corrected_by: string | null;
  corrected_at: string | null;
  created_at: string | null;
  meeting: { id: string; title: string; date: string | null } | null;
}

export interface McpActionItemRow {
  id: string;
  content: string;
  confidence: number | null;
  transcript_ref: string | null;
  metadata: Record<string, unknown> | null;
  corrected_by: string | null;
  corrected_at: string | null;
  created_at: string | null;
  meeting: { id: string; title: string; date: string | null } | null;
}

export interface McpSearchResult {
  id: string;
  content: string;
  type: string;
  source_type: string;
  confidence: number | null;
  corrected_by: string | null;
  date: string | null;
  meeting_title: string | null;
  organization_name: string | null;
  similarity: number;
}

export interface McpListMeetingRow {
  id: string;
  title: string | null;
  date: string | null;
  meeting_type: string | null;
  party_type: string | null;
  relevance_score: number | null;
  organization: { id: string; name: string } | null;
  unmatched_organization_name: string | null;
  summary: string | null;
}

export interface McpOverviewProjectRow {
  id: string;
  name: string;
  aliases: string[] | null;
  status: string | null;
}

export interface McpOverviewMeetingRow {
  id: string;
  title: string | null;
  date: string | null;
  meeting_type: string | null;
  party_type: string | null;
  relevance_score: number | null;
  summary: string | null;
}

export interface McpOverviewExtractionRow {
  type: string;
  content: string;
  confidence: number | null;
  metadata: Record<string, unknown> | null;
  transcript_ref: string | null;
  corrected_by: string | null;
  meeting_id: string | null;
}
