import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runGatekeeper } from "@repo/ai/agents/gatekeeper";
import { getAllKnownPeople } from "@repo/database/queries/people";
import { listMeetingsForReclassify } from "@repo/database/queries/meetings";
import { updateMeetingClassification } from "@repo/database/mutations/meetings";
import { resolveOrganization } from "@repo/ai/pipeline/entity-resolution";
import { classifyParticipantsWithCache, determinePartyType } from "@repo/ai/pipeline/participant-classifier";

const RequestSchema = z.object({
  limit: z.number().min(1).max(100).optional().default(50),
});

/**
 * Reclassify a single meeting: participant classification, gatekeeper, org resolution.
 */
async function reclassifyMeeting(
  meeting: Awaited<ReturnType<typeof listMeetingsForReclassify>>[number],
  knownPeople: Awaited<ReturnType<typeof getAllKnownPeople>>,
) {
  const participants: string[] = meeting.participants ?? [];

  // Classify participants using cached people list
  const classifiedParticipants = classifyParticipantsWithCache(participants, knownPeople);
  const partyType = determinePartyType(classifiedParticipants);
  const partyTypeSource = classifiedParticipants.some(
    (p) => p.label === "external" && p.organizationType,
  ) ? "deterministic" : partyType === "internal" ? "deterministic" : "fallback";

  // Run Gatekeeper for meeting_type + relevance + org name
  const gkResult = await runGatekeeper(meeting.summary ?? "", {
    title: meeting.title,
    participants: classifiedParticipants,
    date: meeting.date ?? undefined,
  });

  // Resolve organization
  const knownOrg = classifiedParticipants.find(
    (p) => p.label === "external" && p.organizationName,
  );
  const orgNameToResolve = knownOrg?.organizationName ?? gkResult.organization_name;
  const orgResult = await resolveOrganization(orgNameToResolve);

  // Build updated raw_fireflies pipeline metadata
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

  // Update meeting in database
  const updateResult = await updateMeetingClassification(meeting.id, {
    meeting_type: gkResult.meeting_type,
    party_type: partyType,
    relevance_score: gkResult.relevance_score,
    organization_id: orgResult.organization_id,
    unmatched_organization_name: orgResult.matched ? null : orgNameToResolve,
    raw_fireflies: rawFireflies,
  });

  const changed =
    meeting.meeting_type !== gkResult.meeting_type ||
    meeting.party_type !== partyType ||
    meeting.relevance_score !== gkResult.relevance_score;

  return {
    id: meeting.id,
    title: meeting.title,
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
    update_error: "error" in updateResult ? updateResult.error : null,
    changed,
  };
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let limit = 50;
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = RequestSchema.safeParse(body);
    if (parsed.success) limit = parsed.data.limit;
  } catch {
    // Empty body is fine, use default limit
  }

  const meetings = await listMeetingsForReclassify(limit);
  if (meetings.length === 0) {
    return NextResponse.json({ success: true, total: 0, changed: 0, results: [] });
  }

  // Pre-fetch all known people once (avoids N+1)
  const knownPeople = await getAllKnownPeople();

  const results = [];
  for (const meeting of meetings) {
    results.push(await reclassifyMeeting(meeting, knownPeople));
  }

  return NextResponse.json({
    success: true,
    total: results.length,
    changed: results.filter((r) => r.changed).length,
    errors: results.filter((r) => r.update_error).length,
    results,
  });
}
