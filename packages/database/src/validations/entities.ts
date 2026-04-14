import { z } from "zod";
import { zUuid } from "./uuid";
import { ORG_TYPES, ORG_STATUSES } from "../constants/organizations";

export const updateOrganizationSchema = z.object({
  id: zUuid,
  name: z.string().min(1, "Naam is verplicht").max(200).optional(),
  type: z.enum(ORG_TYPES).optional(),
  status: z.enum(ORG_STATUSES).optional(),
  contact_person: z.string().max(200).nullable().optional(),
  email: z.string().email("Ongeldig e-mailadres").nullable().optional(),
});

export const updateProjectSchema = z.object({
  id: zUuid,
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
  organization_id: zUuid.nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  owner_id: zUuid.nullable().optional(),
  contact_person_id: zUuid.nullable().optional(),
  start_date: z.string().nullable().optional(),
  deadline: z.string().nullable().optional(),
  github_url: z.string().url("Ongeldige URL").nullable().optional(),
});

export const updatePersonSchema = z.object({
  id: zUuid,
  name: z.string().min(1, "Naam is verplicht").max(200).optional(),
  email: z.string().email("Ongeldig e-mailadres").nullable().optional(),
  role: z.string().max(200).nullable().optional(),
  team: z.string().max(200).nullable().optional(),
  organization_id: zUuid.nullable().optional(),
});

export const createExtractionSchema = z.object({
  meeting_id: zUuid,
  type: z.enum(["decision", "action_item", "need", "insight"]),
  content: z.string().min(1, "Content is verplicht"),
  transcript_ref: z.string().nullable().optional(),
});

export const updateExtractionSchema = z.object({
  id: zUuid,
  content: z.string().min(1, "Content is verplicht").optional(),
  type: z.enum(["decision", "action_item", "need", "insight"]).optional(),
  transcript_ref: z.string().nullable().optional(),
  meetingId: zUuid.optional(),
});

export const deleteSchema = z.object({
  id: zUuid,
});

export const deleteWithContextSchema = deleteSchema.extend({
  meetingId: zUuid.optional(),
});
