import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";

/** Safe version for UI: no tokens exposed */
export interface GoogleAccountSafe {
  id: string;
  email: string;
  is_active: boolean;
  last_sync_at: string | null;
}

/** Full version with tokens: only for sync pipeline (server-side only) */
export interface GoogleAccountRow {
  id: string;
  user_id: string;
  email: string;
  access_token: string;
  refresh_token: string;
  token_expiry: string;
  scopes: string[];
  is_active: boolean;
  last_sync_at: string | null;
}

export async function listActiveGoogleAccountsSafe(
  client?: SupabaseClient,
): Promise<GoogleAccountSafe[]> {
  const db = client ?? getAdminClient();
  const { data, error } = await db
    .from("google_accounts")
    .select("id, email, is_active, last_sync_at")
    .eq("is_active", true);

  if (error || !data) return [];
  return data;
}

export async function listActiveGoogleAccounts(): Promise<GoogleAccountRow[]> {
  const { data, error } = await getAdminClient()
    .from("google_accounts")
    .select(
      "id, user_id, email, access_token, refresh_token, token_expiry, scopes, is_active, last_sync_at",
    )
    .eq("is_active", true);

  if (error || !data) return [];
  return data;
}

export async function getGoogleAccountById(id: string): Promise<GoogleAccountRow | null> {
  const { data, error } = await getAdminClient()
    .from("google_accounts")
    .select(
      "id, user_id, email, access_token, refresh_token, token_expiry, scopes, is_active, last_sync_at",
    )
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data;
}

export async function getGoogleAccountByEmail(email: string): Promise<GoogleAccountRow | null> {
  const { data, error } = await getAdminClient()
    .from("google_accounts")
    .select(
      "id, user_id, email, access_token, refresh_token, token_expiry, scopes, is_active, last_sync_at",
    )
    .eq("email", email)
    .single();

  if (error || !data) return null;
  return data;
}
