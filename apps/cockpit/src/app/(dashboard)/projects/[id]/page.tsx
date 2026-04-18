export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createClient } from "@repo/database/supabase/server";
import { getProjectWorkspaceData } from "@repo/database/queries/project-workspace";
import { listOrganizations } from "@repo/database/queries/organizations";
import { listPeople } from "@repo/database/queries/people";
import { parseMarkdownExtractions } from "@repo/ai/utils/summary-markdown-parser";
import { WorkspaceHeader } from "@/components/projects/workspace/workspace-header";
import { RisksPanel } from "@/components/projects/workspace/risks-panel";
import { DecisionsPanel } from "@/components/projects/workspace/decisions-panel";
import { WaitingClientPanel } from "@/components/projects/workspace/waiting-client-panel";
import { PulsePanel } from "@/components/projects/workspace/pulse-panel";
import { WaitingPlaceholder } from "@/components/projects/workspace/waiting-placeholder";
import type { WorkspaceParsedItem } from "@/components/projects/workspace/types";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [workspace, organizations, people] = await Promise.all([
    getProjectWorkspaceData(id, supabase),
    listOrganizations(supabase),
    listPeople(supabase),
  ]);

  if (!workspace) notFound();

  const { project, segments, waitingOnClient, upcomingMeetings } = workspace;

  const risks: WorkspaceParsedItem[] = [];
  const decisions: WorkspaceParsedItem[] = [];
  for (const segment of segments) {
    const items = parseMarkdownExtractions(segment.kernpunten);
    const source = { id: segment.meeting_id, title: segment.meeting_title };
    for (const item of items) {
      const enriched = { ...item, source_meeting: source };
      if (item.type === "risico") risks.push(enriched);
      else if (item.type === "besluit") decisions.push(enriched);
    }
  }

  const briefing = project.briefing_summary
    ? {
        content: project.briefing_summary.content,
        created_at: project.briefing_summary.created_at,
      }
    : null;

  return (
    <div className="space-y-6 px-4 py-8 lg:px-10">
      <WorkspaceHeader
        project={project}
        organizations={organizations.map((o) => ({ id: o.id, name: o.name }))}
        people={people.map((p) => ({ id: p.id, name: p.name }))}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <RisksPanel items={risks} />
        <DecisionsPanel items={decisions} />
        <WaitingClientPanel items={waitingOnClient} />
        <PulsePanel briefing={briefing} upcomingMeetings={upcomingMeetings} />
        <WaitingPlaceholder />
      </div>
    </div>
  );
}
