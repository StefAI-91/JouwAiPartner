"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@repo/database/supabase/client";
import type { IssueRow } from "@repo/database/queries/issues";
import { IssueList } from "@/components/issues/issue-list";
import { IssueFilters } from "@/components/issues/issue-filters";
import { useProjectId } from "@/hooks/use-project";

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const ISSUE_SELECT = `
  id, project_id, title, description, type, status, priority, component, severity,
  labels, assigned_to, reporter_name, reporter_email, source, userback_id, source_url,
  issue_number, execution_type, ai_executable, duplicate_of_id,
  created_at, updated_at, closed_at,
  assigned_person:assigned_to (id, name)
`;

function IssuesContent() {
  const projectId = useProjectId();
  const searchParams = useSearchParams();
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      setIssues([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const supabase = createClient();

    let query = supabase
      .from("issues")
      .select(ISSUE_SELECT)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(100);

    const status = searchParams.get("status");
    if (status) query = query.in("status", status.split(","));

    const priority = searchParams.get("priority");
    if (priority) query = query.in("priority", priority.split(","));

    const type = searchParams.get("type");
    if (type) query = query.in("type", type.split(","));

    const component = searchParams.get("component");
    if (component) query = query.in("component", component.split(","));

    query.then(({ data }) => {
      const rows = (data ?? []) as unknown as IssueRow[];
      rows.sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority] ?? 99;
        const pb = PRIORITY_ORDER[b.priority] ?? 99;
        if (pa !== pb) return pa - pb;
        return 0;
      });
      setIssues(rows);
      setLoading(false);
    });
  }, [projectId, searchParams]);

  if (!projectId) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Select a project to view issues.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <IssueFilters />
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="size-5 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-muted-foreground" />
        </div>
      ) : (
        <IssueList issues={issues} />
      )}
    </div>
  );
}

export default function IssuesPage() {
  return (
    <Suspense>
      <IssuesContent />
    </Suspense>
  );
}
