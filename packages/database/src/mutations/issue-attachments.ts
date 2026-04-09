import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient } from "../supabase/admin";

const BUCKET_ID = "issue-attachments";
const DOWNLOAD_TIMEOUT_MS = 30_000;

export interface InsertAttachmentData {
  issue_id: string;
  type: "screenshot" | "video" | "attachment";
  storage_path: string;
  original_url: string;
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
