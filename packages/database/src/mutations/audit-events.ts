import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";

export interface AuditEventInput {
  event_type: string;
  actor_id: string | null;
  target_id?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Schrijft één audit-rij. Gebruikt service-role default — RLS staat alleen
 * admin-reads toe en de mutatie hoort vanuit een server action te komen die
 * zelf al een `isAdmin`-check doet.
 *
 * Logt errors maar gooit niet — een gefaalde audit-trail mag de hoofdmutatie
 * (whitelist-update) niet blokkeren. Triage merkt het ontbreken via een
 * gap in `audit_events.created_at` op de admin-detail-pagina.
 */
export async function recordAuditEvent(
  input: AuditEventInput,
  client?: SupabaseClient,
): Promise<{ success: true } | { error: string }> {
  const db = client ?? getAdminClient();
  const { error } = await db.from("audit_events").insert({
    event_type: input.event_type,
    actor_id: input.actor_id,
    target_id: input.target_id ?? null,
    metadata: input.metadata ?? {},
  });

  if (error) {
    console.error("[recordAuditEvent]", input.event_type, error.message);
    return { error: error.message };
  }
  return { success: true };
}
