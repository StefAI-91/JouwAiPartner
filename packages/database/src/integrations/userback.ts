import type { InsertIssueData } from "../mutations/issues";

// ── Types ──

interface UserbackPagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  totalPages: number;
}

interface UserbackScreenshot {
  url: string;
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
  screenshots: UserbackScreenshot[];
  browser: string | null;
  os: string | null;
  resolution: string | null;
  due_date: string | null;
  created_at: string;
  modified_at: string;
  [key: string]: unknown;
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

// ── Field Mapping ──

const FEEDBACK_TYPE_MAP: Record<string, string> = {
  Bug: "bug",
  Idea: "feature_request",
  General: "question",
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
 * Map a Userback feedback item to our issues table insert format.
 */
export function mapUserbackToIssue(item: UserbackFeedbackItem, projectId: string): InsertIssueData {
  const screenshotUrl = item.screenshots?.[0]?.url ?? null;
  const description = typeof item.description === "string" ? item.description : null;

  return {
    project_id: projectId,
    title: extractTitle(description),
    description,
    type: FEEDBACK_TYPE_MAP[item.feedback_type] ?? "question",
    priority: PRIORITY_MAP[item.priority] ?? "medium",
    status: STATUS_MAP[item.status] ?? "triage",
    reporter_email: item.email ?? null,
    reporter_name: item.name ?? null,
    source: "userback",
    userback_id: String(item.id),
    source_url: item.page_url ?? null,
    source_metadata: {
      screenshot_url: screenshotUrl,
      share_url: item.share_url,
      browser: item.browser,
      os: item.os,
      screen: item.resolution,
      userback_created_at: item.created_at,
      userback_modified_at: item.modified_at,
      feedback_type: item.feedback_type,
      raw_userback: item,
      ...(isSentinelDate(item.due_date) ? {} : { due_date: item.due_date }),
    },
  };
}
