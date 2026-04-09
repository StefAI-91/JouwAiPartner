import { z } from "zod";
import {
  ISSUE_TYPES,
  ISSUE_STATUSES,
  ISSUE_PRIORITIES,
  ISSUE_COMPONENTS,
  ISSUE_SEVERITIES,
} from "../constants/issues";

export const createIssueSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(1, "Titel is verplicht").max(500),
  description: z.string().max(10000).nullish(),
  type: z.enum(ISSUE_TYPES).default("bug"),
  status: z.enum(ISSUE_STATUSES).default("triage"),
  priority: z.enum(ISSUE_PRIORITIES).default("medium"),
  component: z.enum(ISSUE_COMPONENTS).nullish(),
  severity: z.enum(ISSUE_SEVERITIES).nullish(),
  labels: z.array(z.string()).default([]),
  assigned_to: z.string().uuid().nullish(),
  reporter_name: z.string().max(200).nullish(),
  reporter_email: z.string().email().nullish(),
});

export const updateIssueSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).nullish(),
  type: z.enum(ISSUE_TYPES).optional(),
  status: z.enum(ISSUE_STATUSES).optional(),
  priority: z.enum(ISSUE_PRIORITIES).optional(),
  component: z.enum(ISSUE_COMPONENTS).nullish(),
  severity: z.enum(ISSUE_SEVERITIES).nullish(),
  labels: z.array(z.string()).optional(),
  assigned_to: z.string().uuid().nullable().optional(),
});

export const deleteIssueSchema = z.object({
  id: z.string().uuid(),
});

export const createCommentSchema = z.object({
  issue_id: z.string().uuid(),
  body: z.string().min(1, "Reactie mag niet leeg zijn").max(10000),
});

export const updateCommentSchema = z.object({
  id: z.string().uuid(),
  issue_id: z.string().uuid(),
  body: z.string().min(1, "Reactie mag niet leeg zijn").max(10000),
});

export const deleteCommentSchema = z.object({
  id: z.string().uuid(),
  issue_id: z.string().uuid(),
});
