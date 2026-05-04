import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../../supabase/admin";

const BUCKET_ID = "issue-attachments";
const DOWNLOAD_TIMEOUT_MS = 30_000;

export interface InsertAttachmentData {
  issue_id: string;
  type: "screenshot" | "video" | "attachment";
  storage_path: string;
  original_url: string | null;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  width: number | null;
  height: number | null;
}

/**
 * Download a file from an external URL and upload it to Supabase storage.
 * Returns the storage path on success, null on failure.
 */
export async function downloadAndUpload(
  url: string,
  storagePath: string,
  client?: SupabaseClient,
): Promise<{ path: string; size: number; mimeType: string | null } | null> {
  const db = client ?? getAdminClient();

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error(`[downloadAndUpload] Failed to fetch ${url}: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get("content-type");
    const blob = await response.blob();

    const { error } = await db.storage.from(BUCKET_ID).upload(storagePath, blob, {
      contentType: contentType ?? undefined,
      upsert: true,
    });

    if (error) {
      console.error(`[downloadAndUpload] Upload failed for ${storagePath}:`, error.message);
      return null;
    }

    return {
      path: storagePath,
      size: blob.size,
      mimeType: contentType,
    };
  } catch (err) {
    console.error(`[downloadAndUpload] Error for ${url}:`, err);
    return null;
  }
}

/**
 * Get the public URL for a file in the issue-attachments bucket.
 */
export function getAttachmentPublicUrl(storagePath: string, client?: SupabaseClient): string {
  const db = client ?? getAdminClient();
  const { data } = db.storage.from(BUCKET_ID).getPublicUrl(storagePath);
  return data.publicUrl;
}

/**
 * Insert an attachment record into the issue_attachments table.
 */
export async function insertAttachment(
  data: InsertAttachmentData,
  client?: SupabaseClient,
): Promise<void> {
  const db = client ?? getAdminClient();
  const { error } = await db.from("issue_attachments").insert(data);

  if (error) throw new Error(`Failed to insert attachment: ${error.message}`);
}

/**
 * WG-006: upload een widget-screenshot (data URL, JPEG) naar de
 * `issue-attachments` bucket en koppel een attachment-rij aan het issue.
 * Niet-throwing — fouten zijn gelogd en als `{ error }` teruggegeven zodat
 * de ingest-route de issue-200-response niet stuk maakt op upload-falen.
 */
export async function uploadScreenshotDataUrl(
  issueId: string,
  dataUrl: string,
  width: number,
  height: number,
  client?: SupabaseClient,
): Promise<{ success: true } | { error: string }> {
  const db = client ?? getAdminClient();
  const base64 = dataUrl.split(",")[1] ?? "";
  if (!base64) return { error: "screenshot data_url miste base64-payload" };

  let bytes: Uint8Array;
  try {
    const binary = Buffer.from(base64, "base64");
    bytes = new Uint8Array(binary);
  } catch (err) {
    return { error: `screenshot base64 decode mislukte: ${(err as Error).message}` };
  }

  const storagePath = `widget/${issueId}/screenshot.jpg`;
  const { error: uploadErr } = await db.storage
    .from(BUCKET_ID)
    .upload(storagePath, bytes, { contentType: "image/jpeg", upsert: true });
  if (uploadErr) return { error: `storage upload mislukte: ${uploadErr.message}` };

  try {
    await insertAttachment(
      {
        issue_id: issueId,
        type: "screenshot",
        storage_path: storagePath,
        original_url: null,
        file_name: "screenshot.jpg",
        mime_type: "image/jpeg",
        file_size: bytes.byteLength,
        width,
        height,
      },
      db,
    );
  } catch (err) {
    return { error: `attachment-row insert mislukte: ${(err as Error).message}` };
  }
  return { success: true };
}

/**
 * Download media from external URLs, upload to Supabase storage,
 * and insert attachment records for an issue.
 *
 * @param issueId - The issue to attach files to
 * @param userbackId - Userback feedback ID (used for storage path naming)
 * @param mediaItems - Array of media items with URL, type, and optional dimensions
 * @returns Number of successfully stored attachments
 */
export async function storeIssueMedia(
  issueId: string,
  userbackId: string,
  mediaItems: Array<{
    url: string;
    type: "screenshot" | "video" | "attachment";
    width?: number;
    height?: number;
  }>,
  client?: SupabaseClient,
): Promise<number> {
  const db = client ?? getAdminClient();
  let stored = 0;

  for (let i = 0; i < mediaItems.length; i++) {
    const item = mediaItems[i];

    // Derive file extension from URL
    const urlPath = new URL(item.url).pathname;
    const ext = urlPath.split(".").pop()?.toLowerCase() ?? "bin";
    const fileName = `${item.type}_${i}.${ext}`;
    const storagePath = `userback/${userbackId}/${fileName}`;

    const result = await downloadAndUpload(item.url, storagePath, db);
    if (!result) continue;

    await insertAttachment(
      {
        issue_id: issueId,
        type: item.type,
        storage_path: result.path,
        original_url: item.url,
        file_name: fileName,
        mime_type: result.mimeType,
        file_size: result.size,
        width: item.width ?? null,
        height: item.height ?? null,
      },
      db,
    );

    stored++;
  }

  return stored;
}
