import { z } from "zod";

export const insertMeetingSchema = z.object({
  fireflies_id: z.string(),
  title: z.string(),
  date: z.string(),
  participants: z.array(z.string()),
  summary: z.string(),
  transcript: z.string(),
  meeting_type: z.string(),
  party_type: z.string(),
  relevance_score: z.number().min(0).max(1),
  organization_id: z.string().uuid().nullable(),
  unmatched_organization_name: z.string().nullable(),
  raw_fireflies: z.record(z.unknown()).nullable().optional(),
  embedding_stale: z.boolean(),
});

export const updateMeetingProjectSchema = z.object({
  meetingId: z.string().uuid(),
  projectId: z.string().uuid(),
});
