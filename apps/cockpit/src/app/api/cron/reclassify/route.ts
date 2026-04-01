import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@repo/database/supabase/admin";
import { runGatekeeper } from "@repo/ai/agents/gatekeeper";
import { getAllKnownPeople } from "@repo/database/queries/people";
import { resolveOrganization } from "@repo/ai/pipeline/entity-resolution";
import type { ParticipantInfo } from "@repo/ai/agents/gatekeeper";
import type { PartyType } from "@repo/ai/validations/gatekeeper";
import type { KnownPerson } from "@repo/database/queries/people";

const INTERNAL_DOMAINS = ["jouwaipartner.nl", "jaip.nl"];

function classifyParticipantsSync(
  rawParticipants: string[],
  knownPeople: KnownPerson[],
): ParticipantInfo[] {
  // Split comma-separated participant strings + deduplicate
  const participants = rawParticipants.flatMap((p) =>
    p.includes(",") ? p.split(",").map((s) => s.trim()).filter(Boolean) : [p],
  );
  const unique = [...new Set(participants.map((p) => p.toLowerCase().trim()))];

  return unique.map((normalized) => {
    const raw = normalized;

    const match = knownPeople.find(
      (p) => p.email && p.email.toLowerCase() === normalized,
    ) ?? knownPeople.find(
      (p) => p.name.toLowerCase() === normalized,
    );

    if (match) {
      if (match.team) return { raw, label: "internal" as const, matchedName: match.name };
      return {
        raw,
        label: "external" as const,
        matchedName: match.name,
        organizationName: match.organization_name,
        organizationType: match.organization_type,
      };
    }

    // Fallback: check if email domain is internal
    const domain = raw.includes("@") ? raw.split("@")[1] : null;
    if (domain && INTERNAL_DOMAINS.includes(domain)) {
      return { raw, label: "internal" as const };
    }

    return { raw, label: "unknown" as const };
  });
}

function determinePartyType(participants: ParticipantInfo[]): PartyType {
  if (participants.length === 0) return "other";
  if (participants.every((p) => p.label === "internal")) return "internal";

  const knownExternal = participants.find(
    (p) => p.label === "external" && p.organizationType,
  );
  if (knownExternal?.organizationType === "client") return "client";
  if (knownExternal?.organizationType === "partner") return "partner";

  return "other";
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminClient();

  const { data: meetings, error } = await db
    .from("meetings")
    .select("id, title, date, participants, summary, meeting_type, party_type, relevance_score, raw_fireflies")
    .order("date", { ascending: false });

  if (error || !meetings) {
    return NextResponse.json({ error: "Failed to fetch meetings" }, { status: 500 });
  }

  const knownPeople = await getAllKnownPeople();

  const results: {
    id: string;
    title: string | null;
    participants_raw: string[];
    participants_classified: { raw: string; label: string; matched?: string }[];
    old: { meeting_type: string | null; party_type: string | null; relevance_score: number | null };
    new: { meeting_type: string; party_type: string; relevance_score: number };
    party_type_source: string;
    changed: boolean;
  }[] = [];

  for (const meeting of meetings) {
    const participants: string[] = meeting.participants ?? [];

    // Classify participants
    const classifiedParticipants = classifyParticipantsSync(participants, knownPeople);

    // Determine party_type deterministically
    const partyType = determinePartyType(classifiedParticipants);
    const partyTypeSource = classifiedParticipants.some(
      (p) => p.label === "external" && p.organizationType,
    ) ? "deterministic" : partyType === "internal" ? "deterministic" : "gatekeeper_fallback";

    // Run Gatekeeper for meeting_type + relevance + org name
    const gkResult = await runGatekeeper(meeting.summary ?? "", {
      title: meeting.title,
      participants: classifiedParticipants,
      date: meeting.date,
    });

    // Resolve organization — known org first, Gatekeeper fallback
    const knownOrg = classifiedParticipants.find(
      (p) => p.label === "external" && p.organizationName,
    );
    const orgNameToResolve = knownOrg?.organizationName ?? gkResult.organization_name;
    const orgResult = await resolveOrganization(orgNameToResolve);

    // Update meeting
    const rawFireflies = (meeting.raw_fireflies as Record<string, unknown>) ?? {};
    rawFireflies.pipeline = {
      ...(rawFireflies.pipeline as Record<string, unknown> ?? {}),
      participant_classification: classifiedParticipants.map((p) => ({
        raw: p.raw,
        label: p.label,
        matched_name: p.matchedName ?? null,
        organization_name: p.organizationName ?? null,
        organization_type: p.organizationType ?? null,
      })),
      party_type_source: partyTypeSource,
      gatekeeper: {
        meeting_type: gkResult.meeting_type,
        relevance_score: gkResult.relevance_score,
        reason: gkResult.reason,
        organization_name: gkResult.organization_name,
      },
      reclassified_at: new Date().toISOString(),
    };

    await db
      .from("meetings")
      .update({
        meeting_type: gkResult.meeting_type,
        party_type: partyType,
        relevance_score: gkResult.relevance_score,
        organization_id: orgResult.organization_id,
        unmatched_organization_name: orgResult.matched ? null : orgNameToResolve,
        raw_fireflies: rawFireflies,
      })
      .eq("id", meeting.id);

    const changed =
      meeting.meeting_type !== gkResult.meeting_type ||
      meeting.party_type !== partyType ||
      meeting.relevance_score !== gkResult.relevance_score;

    results.push({
      id: meeting.id,
      title: meeting.title,
      participants_raw: participants,
      participants_classified: classifiedParticipants.map((p) => ({
        raw: p.raw,
        label: p.label,
        ...(p.matchedName ? { matched: p.matchedName } : {}),
      })),
      old: {
        meeting_type: meeting.meeting_type,
        party_type: meeting.party_type,
        relevance_score: meeting.relevance_score,
      },
      new: {
        meeting_type: gkResult.meeting_type,
        party_type: partyType,
        relevance_score: gkResult.relevance_score,
      },
      party_type_source: partyTypeSource,
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
