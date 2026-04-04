import { z } from "zod";

export const verifyMeetingSchema = z.object({
  meetingId: z.string().uuid(),
});

export const verifyMeetingWithEditsSchema = z.object({
  meetingId: z.string().uuid(),
  extractionEdits: z
    .array(
      z.object({
        extractionId: z.string().uuid(),
        content: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .optional(),
  rejectedExtractionIds: z.array(z.string().uuid()).optional(),
  typeChanges: z
    .array(
      z.object({
        extractionId: z.string().uuid(),
        type: z.enum(["decision", "action_item", "need", "insight"]),
      }),
    )
    .optional(),
  summaryEdit: z.string().optional(),
});

export const rejectMeetingSchema = z.object({
  meetingId: z.string().uuid(),
  reason: z.string().min(1, "Reason is required"),
});
