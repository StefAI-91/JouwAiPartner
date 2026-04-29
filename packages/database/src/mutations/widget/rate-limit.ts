import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";

/**
 * Atomische "+1" op de widget_rate_limits-counter voor `(key, currenthour-
 * bucket)`. Roept de Postgres-RPC `increment_rate_limit` aan zodat de
 * UPSERT row-locked + race-vrij in de DB gebeurt — PostgREST `upsert(...)`
 * kan zelf geen `count + 1` uitdrukken.
 *
 * Gooit door op DB-fouten zodat de aanroepende util fail-open kan beslissen
 * (zie `apps/devhub/src/lib/rate-limit.ts`). Geen silent zero — dat zou
 * een doofpot zijn waarbij we 30/uur stilletjes naar oneindig kantelen.
 */
export async function incrementRateLimit(key: string, client?: SupabaseClient): Promise<number> {
  const db = client ?? getAdminClient();
  const { data, error } = await db.rpc("increment_rate_limit", { p_key: key });
  if (error) throw error;
  if (typeof data !== "number") {
    throw new Error(`increment_rate_limit returned non-number: ${JSON.stringify(data)}`);
  }
  return data;
}
