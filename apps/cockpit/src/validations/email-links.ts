import { z } from "zod";
import { zUuid } from "@repo/database/validations/uuid";

export const emailProjectSchema = z.object({
  emailId: zUuid,
  projectId: zUuid,
});

export const emailOrganizationSchema = z.object({
  emailId: zUuid,
  organizationId: zUuid.nullable(),
});

export const emailSenderPersonSchema = z.object({
  emailId: zUuid,
  senderPersonId: zUuid.nullable(),
});

export const emailTypeSchema = z.object({
  emailId: zUuid,
  emailType: z
    .enum([
      "project_communication",
      "sales",
      "internal",
      "administrative",
      "legal_finance",
      "newsletter",
      "notification",
      "other",
    ])
    .nullable(),
});

export const emailPartyTypeSchema = z.object({
  emailId: zUuid,
  partyType: z
    .enum(["internal", "client", "accountant", "tax_advisor", "lawyer", "partner", "other"])
    .nullable(),
});
