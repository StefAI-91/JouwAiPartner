import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";

const BUCKET_ID = "issue-attachments";
const STORAGE_PREFIX = "widget";

export interface UploadScreenshotResult {
  /** UUID dat de widget bewaart en in de feedback-POST meegeeft (WG-006b). */
  token: string;
  /** Pad in `issue-attachments`-bucket. Wordt **niet** terug naar de client gestuurd
   *  — alleen voor server-side logs/debugging. */
  storage_path: string;
  /** ISO-string van het moment waarop de token niet meer claimbaar is. */
  expires_at: string;
}

/**
 * Upload een widget-screenshot naar storage en registreer een claim-token.
 *
 * Volgorde matters: eerst storage-write, dan token-insert. Bij token-insert-
 * fout ruimen we het storage-object op zodat we geen wezen-bestanden laten
 * staan (WG-REQ-111). Bij storage-fout = geen token, geen wees.
 *
 * `client` is optioneel — default is admin (service-role). De caller is
 * altijd een server-route die met admin werkt; tests kunnen een eigen
 * client injecteren.
 */
export async function uploadWidgetScreenshot(
  projectId: string,
  file: ArrayBuffer | Blob,
  mimeType: string,
  client?: SupabaseClient,
): Promise<UploadScreenshotResult> {
  const db = client ?? getAdminClient();
  const token = crypto.randomUUID();
  const storage_path = `${STORAGE_PREFIX}/${token}.png`;

  const { error: uploadError } = await db.storage
    .from(BUCKET_ID)
    .upload(storage_path, file, { contentType: mimeType, upsert: false });
  if (uploadError) {
    throw new Error(`screenshot_upload_failed: ${uploadError.message}`);
  }

  const { data, error: insertError } = await db
    .from("widget_screenshot_tokens")
    .insert({ token, project_id: projectId, storage_path })
    .select("token, storage_path, expires_at")
    .single();

  if (insertError || !data) {
    // Wees-bestand opruimen — token-tabel is single source of truth.
    await db.storage.from(BUCKET_ID).remove([storage_path]);
    throw new Error(
      `screenshot_token_insert_failed: ${insertError?.message ?? "no data returned"}`,
    );
  }

  return {
    token: data.token,
    storage_path: data.storage_path,
    expires_at: data.expires_at,
  };
}
