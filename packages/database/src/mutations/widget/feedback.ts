import type { SupabaseClient } from "@supabase/supabase-js";
import { insertIssue, type InsertIssueData } from "../issues";
import { defaultStatusForSource } from "../../constants/issues";
import { isTestSubmission } from "../../integrations/userback";
import type { WidgetIngestInput } from "../../validations/widget";

const TYPE_MAP: Record<WidgetIngestInput["type"], InsertIssueData["type"]> = {
  bug: "bug",
  idea: "feature_request",
  question: "question",
};

/**
 * Eerste regel van de description als fallback-titel. Komt nooit langer dan
 * 200 chars zodat de DB-index op `title` niet ontploft.
 */
function extractFirstLine(description: string): string {
  const firstLine = description.split(/\r?\n/)[0]?.trim() ?? "";
  return firstLine.slice(0, 200) || "Widget feedback";
}

/**
 * Wrapper rond `insertIssue` voor inkomende widget-feedback. Forceert
 * `source = 'jaip_widget'` zodat triage en analytics deze stroom kunnen
 * herkennen, en label `'test'` voor test-submissies zodat ze gefilterd
 * kunnen worden uit klant-views.
 *
 * Geen `priority` mee — de DB-default ('medium') komt over. AI-classificatie
 * (DH-006) vult later het echte priority-veld.
 */
export async function insertWidgetIssue(input: WidgetIngestInput, client?: SupabaseClient) {
  const isTest = isTestSubmission(input.description);

  return insertIssue(
    {
      project_id: input.project_id,
      title: extractFirstLine(input.description),
      description: input.description,
      type: TYPE_MAP[input.type],
      status: defaultStatusForSource("jaip_widget"),
      source: "jaip_widget",
      source_url: input.context.url,
      source_metadata: {
        viewport: input.context.viewport,
        user_agent: input.context.user_agent,
        submitted_at: new Date().toISOString(),
      },
      reporter_email: input.reporter_email ?? null,
      labels: isTest ? ["test"] : [],
    },
    client,
  );
}
