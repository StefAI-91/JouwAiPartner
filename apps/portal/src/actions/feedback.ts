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

  const { project_id, title, description, type, source_metadata } = parsed.data;

  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);

  if (!profile) return { error: "Niet ingelogd" };

  // PR-024: members met portal_project_access kunnen ook feedback submitten;
  // hasPortalProjectAccess is de single source of truth voor portal-toegang.
  const allowed = await hasPortalProjectAccess(profile.id, project_id, supabase);
  if (!allowed) return { error: "Geen toegang tot dit project" };

  // PR-021: bug-hint-velden komen optioneel binnen via source_metadata. Lege
  // strings filteren we hier zodat de DB geen `{"browser": ""}`-rijen krijgt.
  const cleanedHints = source_metadata
    ? Object.fromEntries(
        Object.entries(source_metadata).filter(([, v]) => typeof v === "string" && v.trim() !== ""),
      )
    : {};

  const result = await insertIssue(
    {
      project_id,
      title,
      description,
      type,
      status: "triage",
      priority: "medium",
      source: "portal",
      reporter_email: profile.email,
      source_metadata: {
        submitted_at: new Date().toISOString(),
        ...cleanedHints,
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
