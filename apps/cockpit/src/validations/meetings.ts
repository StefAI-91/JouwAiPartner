import { z } from "zod";

export const updateTitleSchema = z.object({
  meetingId: z.string().uuid(),
  title: z.string().min(1, "Titel is verplicht").max(500),
});

export const updateSummarySchema = z.object({
  meetingId: z.string().uuid(),
  summary: z.string().min(1, "Samenvatting is verplicht"),
});

export const updateMeetingTypeSchema = z.object({
  meetingId: z.string().uuid(),
  meetingType: z.enum([
    "strategy",
    "one_on_one",
    "team_sync",
    "discovery",
    "sales",
    "project_kickoff",
    "status_update",
    "collaboration",
    "other",
  ]),
});

export const updateMeetingOrganizationSchema = z.object({
  meetingId: z.string().uuid(),
  organizationId: z.string().uuid().nullable(),
});

export const meetingProjectSchema = z.object({
  meetingId: z.string().uuid(),
  projectId: z.string().uuid(),
});

export const meetingParticipantSchema = z.object({
  meetingId: z.string().uuid(),
  personId: z.string().uuid(),
});

export const createOrganizationSchema = z.object({
  name: z.string().min(1, "Naam is verplicht").max(200),
  type: z.enum(["client", "partner", "supplier", "other"]).optional(),
});

export const createProjectSchema = z.object({
  name: z.string().min(1, "Naam is verplicht").max(200),
  organizationId: z.string().uuid().nullable().optional(),
});

export const createPersonSchema = z.object({
  name: z.string().min(1, "Naam is verplicht").max(200),
  email: z.string().email("Ongeldig e-mailadres").nullable().optional(),
  role: z.string().max(200).nullable().optional(),
  organizationId: z.string().uuid().nullable().optional(),
});

export const regenerateSchema = z.object({
  meetingId: z.string().uuid(),
});
