// ── Raw values (voor Zod schemas en database checks) ──

export const ISSUE_TYPES = ["bug", "feature", "improvement", "task", "question"] as const;
export type IssueType = (typeof ISSUE_TYPES)[number];

export const ISSUE_STATUSES = [
  "triage",
  "backlog",
  "todo",
  "in_progress",
  "done",
  "cancelled",
] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const ISSUE_PRIORITIES = ["urgent", "high", "medium", "low"] as const;
export type IssuePriority = (typeof ISSUE_PRIORITIES)[number];

export const ISSUE_COMPONENTS = [
  "frontend",
  "backend",
  "api",
  "database",
  "prompt_ai",
  "unknown",
] as const;
export type IssueComponent = (typeof ISSUE_COMPONENTS)[number];

export const ISSUE_SEVERITIES = ["critical", "high", "medium", "low"] as const;
export type IssueSeverity = (typeof ISSUE_SEVERITIES)[number];

export const CLOSED_STATUSES = new Set<IssueStatus>(["done", "cancelled"]);

// ── Labels voor UI (voor dropdowns en badges) ──

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  bug: "Bug",
  feature: "Feature",
  improvement: "Improvement",
  task: "Task",
  question: "Question",
};

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  triage: "Triage",
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "In Progress",
  done: "Done",
  cancelled: "Cancelled",
};

export const ISSUE_PRIORITY_LABELS: Record<IssuePriority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const ISSUE_COMPONENT_LABELS: Record<IssueComponent, string> = {
  frontend: "Frontend",
  backend: "Backend",
  api: "API",
  database: "Database",
  prompt_ai: "Prompt / AI",
  unknown: "Onbekend",
};

export const ISSUE_SEVERITY_LABELS: Record<IssueSeverity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

// ── Priority sort order (voor queries en client-side sorting) ──

export const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};
