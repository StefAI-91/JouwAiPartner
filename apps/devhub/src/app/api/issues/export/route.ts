import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@repo/database/supabase/server";
import { getAuthenticatedUser } from "@repo/auth/helpers";
import { assertProjectAccess, NotAuthorizedError } from "@repo/auth/access";
import { listIssues, ISSUE_SORTS } from "@repo/database/queries/issues";
import { getProjectName } from "@repo/database/queries/projects";
import {
  ISSUE_STATUS_LABELS,
  ISSUE_PRIORITY_LABELS,
  ISSUE_TYPE_LABELS,
  ISSUE_COMPONENT_LABELS,
  ISSUE_SEVERITY_LABELS,
  type IssueStatus,
  type IssuePriority,
  type IssueType,
  type IssueComponent,
  type IssueSeverity,
} from "@repo/database/constants/issues";

const EXPORT_LIMIT = 5_000;

const exportParamsSchema = z.object({
  project: z.string().uuid(),
  status: z.string().optional(),
  priority: z.string().optional(),
  type: z.string().optional(),
  component: z.string().optional(),
  assignee: z.string().optional(),
  q: z.string().trim().max(200).optional(),
  sort: z.enum(ISSUE_SORTS).optional(),
});

function parseSearchQuery(raw: string | undefined): { issueNumber?: number; search?: string } {
  if (!raw) return {};
  const trimmed = raw.trim();
  if (!trimmed) return {};
  const numberMatch = trimmed.match(/^#?(\d+)$/);
  if (numberMatch) {
    const n = Number(numberMatch[1]);
    if (Number.isSafeInteger(n) && n > 0) return { issueNumber: n };
  }
  return { search: trimmed };
}

/**
 * Escape a field for RFC 4180 CSV: wrap in quotes when the field contains a
 * comma, newline, or a quote; double any internal quotes. Everything else is
 * passed through unchanged so plain values stay readable.
 */
function csvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const raw = String(value);
  if (/[",\r\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

const COLUMNS = [
  "issue_number",
  "title",
  "status",
  "priority",
  "type",
  "component",
  "severity",
  "labels",
  "assigned_to",
  "reporter_name",
  "reporter_email",
  "source",
  "source_url",
  "created_at",
  "updated_at",
  "closed_at",
] as const;

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const parsed = exportParamsSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ongeldige parameters" }, { status: 400 });
  }
  const params = parsed.data;

  try {
    await assertProjectAccess(user.id, params.project);
  } catch (e) {
    if (e instanceof NotAuthorizedError) {
      return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
    }
    throw e;
  }

  const supabase = await createClient();
  const { issueNumber, search } = parseSearchQuery(params.q);

  const issues = await listIssues(
    {
      projectId: params.project,
      status: params.status?.split(","),
      priority: params.priority?.split(","),
      type: params.type?.split(","),
      component: params.component?.split(","),
      assignedTo: params.assignee?.split(","),
      issueNumber,
      search,
      sort: params.sort,
      limit: EXPORT_LIMIT,
      offset: 0,
    },
    supabase,
  );

  const projectName = (await getProjectName(params.project)) ?? params.project;
  const today = new Date().toISOString().slice(0, 10);
  const safeProjectSlug = projectName
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const fileName = `issues-${safeProjectSlug || "export"}-${today}.csv`;

  const header = COLUMNS.join(",");
  const rows = issues.map((i) =>
    [
      i.issue_number,
      i.title,
      ISSUE_STATUS_LABELS[i.status as IssueStatus] ?? i.status,
      ISSUE_PRIORITY_LABELS[i.priority as IssuePriority] ?? i.priority,
      ISSUE_TYPE_LABELS[i.type as IssueType] ?? i.type,
      i.component ? (ISSUE_COMPONENT_LABELS[i.component as IssueComponent] ?? i.component) : "",
      i.severity ? (ISSUE_SEVERITY_LABELS[i.severity as IssueSeverity] ?? i.severity) : "",
      (i.labels ?? []).join("; "),
      i.assigned_person?.full_name ?? "",
      i.reporter_name ?? "",
      i.reporter_email ?? "",
      i.source,
      i.source_url ?? "",
      i.created_at,
      i.updated_at,
      i.closed_at ?? "",
    ]
      .map(csvField)
      .join(","),
  );

  // Leading BOM so Excel opens as UTF-8 without mangling accented characters.
  const body = "﻿" + [header, ...rows].join("\r\n") + "\r\n";

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
