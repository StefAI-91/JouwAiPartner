import { z } from "zod";
import { ORG_TYPES } from "../constants/organizations";

// Note: meetingId, projectId, personId etc. komen altijd uit database-sourced props
// (niet uit vrije gebruikersinvoer). De database dwingt UUID types af op deze kolommen.
// We gebruiken .min(1) i.p.v. .uuid() om edge cases in serialisatie te voorkomen.
// Strikte .uuid() validatie zit op MCP tools waar LLMs vrije input sturen.

export const updateTitleSchema = z.object({
  meetingId: z.string().min(1),
  title: z.string().min(1, "Titel is verplicht").max(500),
});

export const updateSummarySchema = z.object({
  meetingId: z.string().min(1),
  summary: z.string().min(1, "Samenvatting is verplicht"),
});

export const updateMeetingTypeSchema = z.object({
  meetingId: z.string().min(1),
  meetingType: z.enum([
    "strategy",
    "one_on_one",
    "team_sync",
    "board",
    "discovery",
    "sales",
    "project_kickoff",
    "status_update",
    "collaboration",
    "other",
  ]),
});

export const updatePartyTypeSchema = z.object({
  meetingId: z.string().min(1),
  partyType: z.enum(["internal", "client", "partner", "other"]),
});

export const updateMeetingOrganizationSchema = z.object({
  meetingId: z.string().min(1),
  organizationId: z.string().nullable(),
});

export const meetingProjectSchema = z.object({
  meetingId: z.string().min(1),
  projectId: z.string().min(1),
});

export const meetingParticipantSchema = z.object({
  meetingId: z.string().min(1),
  personId: z.string().min(1),
});

export const createOrganizationSchema = z.object({
  name: z.string().min(1, "Naam is verplicht").max(200),
  type: z.enum(ORG_TYPES).optional(),
  email: z.string().email("Ongeldig e-mailadres").nullable().optional(),
  email_domains: z
    .array(z.string().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i, "Ongeldig domein"))
    .optional(),
});

export const createProjectSchema = z.object({
  name: z.string().min(1, "Naam is verplicht").max(200),
  organizationId: z.string().nullable().optional(),
});

export const createPersonSchema = z.object({
  name: z.string().min(1, "Naam is verplicht").max(200),
  email: z.string().email("Ongeldig e-mailadres").nullable().optional(),
  role: z.string().max(200).nullable().optional(),
  organizationId: z.string().nullable().optional(),
});

export const updateMeetingMetadataSchema = z.object({
  meetingId: z.string().min(1),
  title: z.string().min(1, "Titel is verplicht").max(500),
  meetingType: z.enum([
    "strategy",
    "one_on_one",
    "team_sync",
    "board",
    "discovery",
    "sales",
    "project_kickoff",
    "status_update",
    "collaboration",
    "other",
  ]),
  partyType: z.enum(["internal", "client", "partner", "other"]),
  organizationId: z.string().nullable(),
  projectIds: z.array(z.string().min(1)),
  participantIds: z.array(z.string().min(1)),
});

export const regenerateSchema = z.object({
  meetingId: z.string().min(1),
});
