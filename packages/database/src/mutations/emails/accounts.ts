import { getAdminClient } from "../../supabase/admin";

export async function upsertGoogleAccount(account: {
  user_id: string;
  email: string;
  access_token: string;
  refresh_token: string;
  token_expiry: string;
  scopes: string[];
}): Promise<{ success: true; data: { id: string } } | { error: string }> {
  const { data, error } = await getAdminClient()
    .from("google_accounts")
    .upsert(account, { onConflict: "email" })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { success: true, data };
}

export async function updateGoogleAccountTokens(
  accountId: string,
  tokens: { access_token: string; token_expiry: string },
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("google_accounts")
    .update({ ...tokens, updated_at: new Date().toISOString() })
    .eq("id", accountId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function updateGoogleAccountLastSync(
  accountId: string,
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("google_accounts")
    .update({ last_sync_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", accountId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function deactivateGoogleAccount(
  accountId: string,
): Promise<{ success: true } | { error: string }> {
  const { error } = await getAdminClient()
    .from("google_accounts")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", accountId);

  if (error) return { error: error.message };
  return { success: true };
}
