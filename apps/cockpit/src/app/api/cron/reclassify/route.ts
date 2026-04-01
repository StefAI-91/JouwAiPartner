import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@repo/database/supabase/admin";
import { runGatekeeper } from "@repo/ai/agents/gatekeeper";
import { getAllKnownPeople } from "@repo/database/queries/people";
import { resolveOrganization } from "@repo/ai/pipeline/entity-resolution";
import type { ParticipantInfo } from "@repo/ai/agents/gatekeeper";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminClient();

  // Fetch all meetings with their summary + participants
  const { data: meetings, error } = await db
    .from("meetings")
    .select("id, title, date, participants, summary, meeting_type, party_type, relevance_score, raw_fireflies")
    .order("date", { ascending: false });

  if (error || !meetings) {
    return NextResponse.json({ error: "Failed to fetch meetings" }, { status: 500 });
  }

  // Pre-fetch all known people once
  const knownPeople = await getAllKnownPeople();

  const results: {
    id: string;
    title: string | null;
    old: { meeting_type: string | null; party_type: string | null; relevance_score: number | null };
    new: { meeting_type: string; party_type: string; relevance_score: number };
    changed: boolean;
  }[] = [];

  for (const meeting of meetings) {
    const participants: string[] = meeting.participants ?? [];

    // Classify participants using known people
    const classifiedParticipants: ParticipantInfo[] = participants.map((raw: string) => {
      const normalized = raw.toLowerCase().trim();

      const match = knownPeople.find(
        (p) => p.email && p.email.toLowerCase() === normalized,
      ) ?? knownPeople.find(
        (p) => p.name.toLowerCase() === normalized,
      );

      if (!match) return { raw, label: "unknown" as const };
      if (match.team) return { raw, label: "internal" as const, matchedName: match.name };
      return {
        raw,
        label: "external" as const,
        matchedName: match.name,
        organizationName: match.organization_name,
      };
    });

    // Run Gatekeeper with enriched participants
    const result = await runGatekeeper(meeting.summary ?? "", {
      title: meeting.title,
      participants: classifiedParticipants,
      date: meeting.date,
    });

    // Resolve organization
    const orgResult = await resolveOrganization(result.organization_name);

    // Update meeting with new classification
    const rawFireflies = (meeting.raw_fireflies as Record<string, unknown>) ?? {};
    rawFireflies.pipeline = {
      ...(rawFireflies.pipeline as Record<string, unknown> ?? {}),
      participant_classification: classifiedParticipants.map((p) => ({
        raw: p.raw,
        label: p.label,
        matched_name: p.matchedName ?? null,
        organization_name: p.organizationName ?? null,
      })),
      gatekeeper: {
        meeting_type: result.meeting_type,
        party_type: result.party_type,
        relevance_score: result.relevance_score,
        reason: result.reason,
        organization_name: result.organization_name,
      },
      reclassified_at: new Date().toISOString(),
    };

    await db
      .from("meetings")
      .update({
        meeting_type: result.meeting_type,
        party_type: result.party_type,
        relevance_score: result.relevance_score,
        organization_id: orgResult.organization_id,
        unmatched_organization_name: orgResult.matched ? null : result.organization_name,
        raw_fireflies: rawFireflies,
      })
      .eq("id", meeting.id);

    const changed =
      meeting.meeting_type !== result.meeting_type ||
      meeting.party_type !== result.party_type ||
      meeting.relevance_score !== result.relevance_score;

    results.push({
      id: meeting.id,
      title: meeting.title,
      old: {
        meeting_type: meeting.meeting_type,
        party_type: meeting.party_type,
        relevance_score: meeting.relevance_score,
      },
      new: {
        meeting_type: result.meeting_type,
        party_type: result.party_type,
        relevance_score: result.relevance_score,
      },
      changed,
    });
  }

  return NextResponse.json({
    success: true,
    total: results.length,
    changed: results.filter((r) => r.changed).length,
    results,
  });
}
