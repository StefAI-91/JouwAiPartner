import { z } from "zod";
import { zUuid } from "./uuid";

export const verifyMeetingSchema = z.object({
  meetingId: zUuid,
});

export const verifyMeetingWithEditsSchema = z.object({
  meetingId: zUuid,
  extractionEdits: z
    .array(
      z.object({
        extractionId: zUuid,
        content: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .optional(),
  rejectedExtractionIds: z.array(zUuid).optional(),
  typeChanges: z
    .array(
      z.object({
        extractionId: zUuid,
        type: z.enum(["decision", "action_item", "need", "insight"]),
      }),
    )
    .optional(),
  summaryEdit: z.string().optional(),
});

export const rejectMeetingSchema = z.object({
  meetingId: zUuid,
  reason: z.string().min(1, "Reason is required"),
});
