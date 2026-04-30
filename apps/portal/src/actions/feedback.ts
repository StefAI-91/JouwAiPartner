"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@repo/database/supabase/server";
import { getCurrentProfile } from "@repo/auth/access";
import { hasPortalProjectAccess } from "@repo/database/queries/portal/access";
import { insertIssue } from "@repo/database/mutations/issues";
import { portalFeedbackSchema } from "@repo/database/validations/portal-feedback";

export interface SubmitFeedbackSuccess {
  success: true;
  issueNumber: number;
  issueId: string;
}

export interface SubmitFeedbackError {
  error: string;
  fieldErrors?: Record<string, string[]>;
}

export type SubmitFeedbackResult = SubmitFeedbackSuccess | SubmitFeedbackError;

export async function submitFeedback(input: unknown): Promise<SubmitFeedbackResult> {
  const parsed = portalFeedbackSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Controleer je invoer",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { project_id, title, description, type } = parsed.data;

  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);

  if (!profile) return { error: "Niet ingelogd" };
  if (profile.role !== "admin" && profile.role !== "client") {
    return { error: "Geen toegang tot het portaal" };
  }

  const allowed = await hasPortalProjectAccess(profile.id, project_id, supabase);
  if (!allowed) return { error: "Geen toegang tot dit project" };

  const result = await insertIssue(
    {
      project_id,
      title,
      description,
      type,
      status: "triage",
      priority: "p2",
      source: "portal",
      reporter_email: profile.email,
      source_metadata: {
        submitted_at: new Date().toISOString(),
      },
    },
    supabase,
  );

  if ("error" in result) {
    return { error: result.error };
  }

  revalidatePath(`/projects/${project_id}`);

  return {
    success: true,
    issueNumber: result.data.issue_number,
    issueId: result.data.id,
  };
}
