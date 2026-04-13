import type { InsertIssueData } from "../mutations/issues";

// ── Types ──

interface UserbackPagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  totalPages: number;
}

export interface UserbackScreenshot {
  url: string;
  width?: number;
  height?: number;
  created?: string;
}

export interface UserbackSession {
  colorDepth?: number;
  dpi?: number;
  resolution?: string;
  window?: string;
  userAgent?: string;
}

export interface UserbackLocation {
  latitude?: number;
  longitude?: number;
  city?: string;
  country?: string;
  postal_code?: string;
}

export interface UserbackFeedbackItem {
  id: number;
  description: string;
  feedback_type: string; // "Bug" | "Idea" | "General"
  priority: string; // "critical" | "important" | "neutral" | "minor"
  status: string; // "Open" | "In Progress" | "Closed"
  email: string | null;
  name: string | null;
  page_url: string | null;
  share_url: string | null;
  // API may return "screenshots" or "Screenshots" — we handle both
  screenshots?: UserbackScreenshot[];
  Screenshots?: UserbackScreenshot[];
  videoUrl?: string | null;
  video_url?: string | null;
  attachmentUrl?: string | null;
  attachment_url?: string | null;
  Session?: UserbackSession | null;
  session?: UserbackSession | null;
  Location?: UserbackLocation | null;
  location?: UserbackLocation | null;
  rating?: string | null; // "star_1" through "star_5"
  category?: string | null;
  browser: string | null;
  os: string | null;
  resolution: string | null;
  due_date: string | null;
  created: string;
  modified: string;
  created_at?: string;
  modified_at?: string;
  [key: string]: unknown;
}

/** Get screenshots array regardless of API casing */
function getScreenshots(item: UserbackFeedbackItem): UserbackScreenshot[] {
  return item.screenshots ?? item.Screenshots ?? [];
}

/** Get video URL regardless of API casing */
function getVideoUrl(item: UserbackFeedbackItem): string | null {
  return item.videoUrl ?? item.video_url ?? null;
}

/** Get attachment URL regardless of API casing */
function getAttachmentUrl(item: UserbackFeedbackItem): string | null {
  return item.attachmentUrl ?? item.attachment_url ?? null;
}

/** Get session regardless of API casing */
function getSession(item: UserbackFeedbackItem): UserbackSession | null {
  return item.Session ?? item.session ?? null;
}

/** Get location regardless of API casing */
function getLocation(item: UserbackFeedbackItem): UserbackLocation | null {
  return item.Location ?? item.location ?? null;
}

interface UserbackFeedbackPage {
  data: UserbackFeedbackItem[];
  _pagination: UserbackPagination;
}

// ── API Client ──

const USERBACK_API_BASE = "https://rest.userback.io/1.0";
const RATE_LIMIT_DELAY_MS = 200;

function getApiToken(): string {
  const token = process.env.USERBACK_API_TOKEN;
  if (!token) throw new Error("USERBACK_API_TOKEN environment variable is not set");
  return token;
}

/**
 * Fetch a single page of Userback feedback items.
 */
export async function fetchUserbackFeedbackPage(options: {
  page: number;
  perPage?: number;
  updatedAfter?: string;
}): Promise<UserbackFeedbackPage> {
  const { page, perPage = 50, updatedAfter } = options;
  const token = getApiToken();

  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });

  if (updatedAfter) {
    params.set("updated_after", updatedAfter);
  }

  const response = await fetch(`${USERBACK_API_BASE}/feedback?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Userback API error ${response.status}: ${body}`);
  }

  return response.json() as Promise<UserbackFeedbackPage>;
}

/**
 * Fetch all Userback feedback, paginating automatically with rate limiting.
 * @param updatedAfter - ISO date string for incremental sync (null = full sync)
 * @param limit - Max items to return (default 10 for testing, set higher for production)
 */
export async function fetchAllUserbackFeedback(
  updatedAfter?: string | null,
  limit: number = 10,
): Promise<UserbackFeedbackItem[]> {
  const allItems: UserbackFeedbackItem[] = [];
  let page = 1;

  while (true) {
    const result = await fetchUserbackFeedbackPage({
      page,
      perPage: Math.min(50, limit - allItems.length),
      updatedAfter: updatedAfter ?? undefined,
    });

    allItems.push(...result.data);

    // Stop if we've hit the limit
    if (allItems.length >= limit) {
      return allItems.slice(0, limit);
    }

    // Stop if we've fetched all pages
    if (page >= result._pagination.totalPages) {
      break;
    }

    page++;

    // Rate limit: 200ms between pages
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
  }

  return allItems;
}

// ── Test Submission Filter ──

const TEST_PATTERNS = [/^test\.?$/i, /^testing\.?$/i, /^dit\s+(is\s+)?een\s+test\b/i];

/**
 * Check if a Userback feedback item is a test submission that should be skipped.
 * Matches short throwaway messages: "test", "dit is een test", "dit een test om X te laten zien".
 * Only triggers on short descriptions (<80 chars) to avoid filtering real feedback
 * that happens to start with "dit is een test...".
 */
export function isTestSubmission(description: string | null | undefined): boolean {
  if (!description) return false;
  const trimmed = description.trim();
  if (!trimmed || trimmed.length > 80) return false;
  return TEST_PATTERNS.some((pattern) => pattern.test(trimmed));
}

// ── Field Mapping ──

const FEEDBACK_TYPE_MAP: Record<string, string> = {
  Bug: "bug",
  Idea: "feature_request",
  General: "bug",
};

const PRIORITY_MAP: Record<string, string> = {
  critical: "urgent",
  important: "high",
  neutral: "medium",
  minor: "low",
};

const STATUS_MAP: Record<string, string> = {
  Open: "triage",
  "In Progress": "in_progress",
  Closed: "done",
};

/**
 * Extract the first line of a description as the title.
 * Max 200 chars.
 */
function extractTitle(description: string | null | undefined): string {
  if (!description) return "Untitled feedback";
  const firstLine = description.split("\n")[0]?.trim() ?? "";
  if (!firstLine) return "Untitled feedback";
  return firstLine.length > 200 ? firstLine.slice(0, 197) + "..." : firstLine;
}

/**
 * Check if a due date is the 1970-01-01 sentinel value.
 */
function isSentinelDate(dateStr: string | null): boolean {
  if (!dateStr) return true;
  return dateStr.startsWith("1970-01-01");
}

/**
 * Extract all media URLs from a Userback feedback item.
 * Returns an array of { url, type, width?, height? } objects.
 */
export function extractMediaUrls(item: UserbackFeedbackItem): Array<{
  url: string;
  type: "screenshot" | "video" | "attachment";
  width?: number;
  height?: number;
}> {
  const media: Array<{
    url: string;
    type: "screenshot" | "video" | "attachment";
    width?: number;
    height?: number;
  }> = [];

  // Screenshots (up to 3) — handle both casings
  const screenshots = getScreenshots(item);
  for (const s of screenshots) {
    if (s.url) {
      media.push({ url: s.url, type: "screenshot", width: s.width, height: s.height });
    }
  }

  // Video recording
  const videoUrl = getVideoUrl(item);
  if (videoUrl) {
    media.push({ url: videoUrl, type: "video" });
  }

  // File attachment
  const attachmentUrl = getAttachmentUrl(item);
  if (attachmentUrl) {
    media.push({ url: attachmentUrl, type: "attachment" });
  }

  return media;
}

/**
 * Map a Userback feedback item to our issues table insert format.
 */
export function mapUserbackToIssue(item: UserbackFeedbackItem, projectId: string): InsertIssueData {
  const screenshots = getScreenshots(item);
  const screenshotUrl = screenshots[0]?.url ?? null;
  const videoUrl = getVideoUrl(item);
  const attachmentUrl = getAttachmentUrl(item);
  const description = typeof item.description === "string" ? item.description : null;

  return {
    project_id: projectId,
    title: extractTitle(description),
    description,
    type: FEEDBACK_TYPE_MAP[item.feedback_type] ?? "bug",
    priority: PRIORITY_MAP[item.priority] ?? "medium",
    status: STATUS_MAP[item.status] ?? "triage",
    reporter_email: item.email ?? null,
    reporter_name: item.name ?? null,
    source: "userback",
    userback_id: String(item.id),
    source_url: item.page_url ?? null,
    created_at: item.created ?? item.created_at,
    source_metadata: {
      screenshot_url: screenshotUrl,
      screenshot_urls: screenshots.map((s) => s.url).filter(Boolean),
      video_url: videoUrl,
      attachment_url: attachmentUrl,
      share_url: item.share_url,
      browser: item.browser,
      os: item.os,
      screen: item.resolution,
      rating: item.rating ?? null,
      category: item.category ?? null,
      session: getSession(item),
      location: getLocation(item),
      userback_created_at: item.created ?? item.created_at,
      userback_modified_at: item.modified ?? item.modified_at,
      feedback_type: item.feedback_type,
      raw_userback: item,
      ...(isSentinelDate(item.due_date) ? {} : { due_date: item.due_date }),
    },
  };
}

/**
 * Extract media URLs from stored source_metadata (for backfill of existing issues).
 * Tries raw_userback first, then falls back to individual metadata fields.
 */
export function extractMediaFromMetadata(metadata: Record<string, unknown>): Array<{
  url: string;
  type: "screenshot" | "video" | "attachment";
  width?: number;
  height?: number;
}> {
  // Try raw_userback object first (has the original API response)
  const raw = metadata.raw_userback as Record<string, unknown> | undefined;
  if (raw) {
    return extractMediaUrls(raw as unknown as UserbackFeedbackItem);
  }

  // Fallback: piece together from individual metadata fields
  const media: Array<{
    url: string;
    type: "screenshot" | "video" | "attachment";
    width?: number;
    height?: number;
  }> = [];

  // Screenshot URLs array
  const screenshotUrls = metadata.screenshot_urls as string[] | undefined;
  if (screenshotUrls?.length) {
    for (const url of screenshotUrls) {
      if (url) media.push({ url, type: "screenshot" });
    }
  } else if (typeof metadata.screenshot_url === "string" && metadata.screenshot_url) {
    media.push({ url: metadata.screenshot_url, type: "screenshot" });
  }

  if (typeof metadata.video_url === "string" && metadata.video_url) {
    media.push({ url: metadata.video_url, type: "video" });
  }

  if (typeof metadata.attachment_url === "string" && metadata.attachment_url) {
    media.push({ url: metadata.attachment_url, type: "attachment" });
  }

  return media;
}
