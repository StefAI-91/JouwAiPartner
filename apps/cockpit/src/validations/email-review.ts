import { z } from "zod";
import { zUuid } from "./uuid";

export const verifyEmailSchema = z.object({
  emailId: zUuid,
});

export const verifyEmailWithEditsSchema = z.object({
  emailId: zUuid,
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
        type: z.enum(["decision", "need", "insight", "project_update", "request"]),
      }),
    )
    .optional(),
});

export const rejectEmailSchema = z.object({
  emailId: zUuid,
  reason: z.string().min(1, "Reason is required"),
});
