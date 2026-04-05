import { z } from "zod";

export const updateOrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Naam is verplicht").max(200).optional(),
  type: z.enum(["client", "partner", "supplier", "other"]).optional(),
  status: z.enum(["prospect", "active", "inactive"]).optional(),
  contact_person: z.string().max(200).nullable().optional(),
  email: z.string().email("Ongeldig e-mailadres").nullable().optional(),
});

export const updateProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Naam is verplicht").max(200).optional(),
  status: z
    .enum([
      "lead",
      "discovery",
      "proposal",
      "negotiation",
      "won",
      "kickoff",
      "in_progress",
      "review",
      "completed",
      "on_hold",
      "lost",
      "maintenance",
      "active",
    ])
    .optional(),
  organization_id: z.string().uuid().nullable().optional(),
});

export const updatePersonSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Naam is verplicht").max(200).optional(),
  email: z.string().email("Ongeldig e-mailadres").nullable().optional(),
  role: z.string().max(200).nullable().optional(),
  team: z.string().max(200).nullable().optional(),
  organization_id: z.string().uuid().nullable().optional(),
});

export const createExtractionSchema = z.object({
  meeting_id: z.string().uuid(),
  type: z.enum(["decision", "action_item", "need", "insight"]),
  content: z.string().min(1, "Content is verplicht"),
  transcript_ref: z.string().nullable().optional(),
});

export const updateExtractionSchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1, "Content is verplicht").optional(),
  type: z.enum(["decision", "action_item", "need", "insight"]).optional(),
  transcript_ref: z.string().nullable().optional(),
  meetingId: z.string().uuid().optional(),
});

export const deleteSchema = z.object({
  id: z.string().uuid(),
});

export const deleteWithContextSchema = deleteSchema.extend({
  meetingId: z.string().uuid().optional(),
});
