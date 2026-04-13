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
  resolutionX?: number;
  resolutionY?: number;
  windowWidth?: number;
  windowHeight?: number;
  userAgent?: string;
  pageTitle?: string;
  uaData?: string;
}

export interface UserbackWorkflow {
  id?: number;
  name?: string;
  sort?: number;
  color?: string;
}

export interface UserbackFeedbackItem {
  id: number;
  projectId?: number;
  description: string;
  feedbackType: string; // "Bug" | "Idea" | "General"
  priority: string; // "critical" | "important" | "neutral" | "minor" (empty string when unset)
  Workflow?: UserbackWorkflow | null; // status lives here ("Open", "In Progress", "Closed", ...)
  email: string | null;
  name: string | null;
  title?: string | null;
  pageUrl: string | null;
  shareUrl: string | null;
  // API may return "screenshots" or "Screenshots" — keep both casings.
  screenshots?: UserbackScreenshot[];
  Screenshots?: UserbackScreenshot[];
  videoUrl?: string | null;
  attachmentUrl?: string | null;
  Session?: UserbackSession | null;
  rating?: string | null; // "star_1" through "star_5", or empty string
  dueDate: string | null; // "1970-01-01T00:00:00.000Z" sentinel when unset
  created: string;
  modified: string;
  [key: string]: unknown;
}

/** Get screenshots array regardless of API casing */
function getScreenshots(item: UserbackFeedbackItem): UserbackScreenshot[] {
  return item.screenshots ?? item.Screenshots ?? [];
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
 * Sort defaults to newest-created first so callers can stop paginating
 * as soon as items pass their cutoff.
 *
 * When `userbackProjectId` is provided the request is scoped to that
 * Userback project via OData filter — otherwise feedback from every
 * project under the API token is returned.
 */
export async function fetchUserbackFeedbackPage(options: {
  page: number;
  perPage?: number;
  sort?: string;
  userbackProjectId?: string;
}): Promise<UserbackFeedbackPage> {
  const { page, perPage = 50, sort = "created,desc", userbackProjectId } = options;
  const token = getApiToken();

  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    sort,
  });

  if (userbackProjectId) {
    params.set("filter", `projectId eq ${userbackProjectId}`);
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
 * Fetch recent Userback feedback newest-first, stopping when items drop
 * below the cutoff or the limit is reached. Dedup happens downstream.
 * @param createdAfter - ISO date; items created before this are excluded
 * @param limit - Max items to return
 * @param userbackProjectId - Scope the fetch to a single Userback project
 */
export async function fetchAllUserbackFeedback(
  createdAfter: string,
  limit: number = 50,
  userbackProjectId?: string,
): Promise<UserbackFeedbackItem[]> {
  const allItems: UserbackFeedbackItem[] = [];
  let page = 1;

  while (allItems.length < limit) {
    const result = await fetchUserbackFeedbackPage({
      page,
      perPage: Math.min(50, limit - allItems.length),
      sort: "created,desc",
      userbackProjectId,
    });

    for (const item of result.data) {
      const created = item.created ?? item.created_at;
      // Page is sorted newest-first, so once we see an older item we're done.
      if (!created || created < createdAfter) return allItems;
      allItems.push(item);
      if (allItems.length >= limit) return allItems;
    }

    if (page >= result._pagination.totalPages) break;

    page++;
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

// Userback stores status as a Workflow row; default columns are
// "Open", "In Progress", "Closed". Custom workflow columns fall through
// to the "triage" default downstream.
const STATUS_MAP: Record<string, string> = {
  Open: "triage",
  "In Progress": "in_progress",
  Closed: "done",
  Resolved: "done",
  Done: "done",
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

  if (item.videoUrl) {
    media.push({ url: item.videoUrl, type: "video" });
  }

  if (item.attachmentUrl) {
    media.push({ url: item.attachmentUrl, type: "attachment" });
  }

  return media;
}

/**
 * Map a Userback feedback item to our issues table insert format.
 */
export function mapUserbackToIssue(item: UserbackFeedbackItem, projectId: string): InsertIssueData {
  const screenshots = getScreenshots(item);
  const screenshotUrl = screenshots[0]?.url ?? null;
  const description = typeof item.description === "string" ? item.description : null;
  const workflowName = item.Workflow?.name ?? null;
  const rating = item.rating && item.rating.length > 0 ? item.rating : null;

  return {
    project_id: projectId,
    title: extractTitle(description),
    description,
    type: FEEDBACK_TYPE_MAP[item.feedbackType] ?? "bug",
    priority: PRIORITY_MAP[item.priority] ?? "medium",
    status: (workflowName && STATUS_MAP[workflowName]) ?? "triage",
    reporter_email: item.email ? item.email : null,
    reporter_name: item.name ? item.name : null,
    source: "userback",
    userback_id: String(item.id),
    source_url: item.pageUrl ?? null,
    created_at: item.created,
    source_metadata: {
      screenshot_url: screenshotUrl,
      screenshot_urls: screenshots.map((s) => s.url).filter(Boolean),
      video_url: item.videoUrl ?? null,
      attachment_url: item.attachmentUrl ?? null,
      share_url: item.shareUrl,
      rating,
      session: item.Session ?? null,
      workflow: item.Workflow ?? null,
      workflow_name: workflowName,
      userback_created_at: item.created,
      userback_modified_at: item.modified,
      userback_project_id: item.projectId ?? null,
      feedback_type: item.feedbackType,
      raw_userback: item,
      ...(isSentinelDate(item.dueDate) ? {} : { due_date: item.dueDate }),
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
