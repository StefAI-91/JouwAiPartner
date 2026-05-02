"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@repo/database/supabase/server";
import { getCurrentProfile } from "@repo/auth/access";
import {
  endorseIssue,
  declineIssue,
  deferIssue,
  convertIssueToQuestion,
} from "@repo/database/mutations/issues";
import type { PmReviewMutationResult } from "@repo/database/mutations/issues/pm-review";
import { markInboxItemRead } from "@repo/database/mutations/inbox-reads";
import { notifyFeedbackStatusChanged } from "@repo/notifications";
import type { IssueStatus } from "@repo/database/constants/issues";
import { pmReviewActionSchema, type PmReviewAction } from "../validations/pm-review";

/**
 * CC-001 — Server actions voor de vier PM-acties op needs_pm_review issues.
 *
 * Eén entry-point (`pmReviewAction`) i.p.v. vier losse acties: payload is
 * een discriminated union, validatie en auth zijn identiek. Dat scheelt 4×
 * boilerplate en houdt revalidatie consistent.
 *
 * Auth: cockpit is team-only; client-rol blokkeren we expliciet zodat een
 * (theoretisch) klant met een ingejatte form-submit niets kan doen.
 */

export type PmReviewActionResult = { success: true } | { error: string };

export async function pmReviewAction(input: PmReviewAction): Promise<PmReviewActionResult> {
  const parsed = pmReviewActionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile) return { error: "Niet ingelogd" };
  if (profile.role === "client") return { error: "Geen toegang" };

  const data = parsed.data;
  const issueId = data.issueId;
  let mutationResult: PmReviewMutationResult;
  let nextStatus: IssueStatus;

  switch (data.action) {
    case "endorse":
      mutationResult = await endorseIssue(issueId, profile.id, supabase);
      nextStatus = "triage";
      break;
    case "decline":
      mutationResult = await declineIssue(issueId, profile.id, data.declineReason, supabase);
      nextStatus = "declined";
      break;
    case "defer":
      mutationResult = await deferIssue(issueId, profile.id, supabase);
      nextStatus = "deferred";
      break;
    case "convert":
      mutationResult = await convertIssueToQuestion(
        issueId,
        profile.id,
        data.questionBody,
        supabase,
      );
      nextStatus = "converted_to_qa";
      break;
  }

  if ("error" in mutationResult) return { error: mutationResult.error };

  // Implicit read: PM die een actie neemt heeft het item dus gezien.
  await markInboxItemRead(profile.id, "issue", issueId, supabase);

  // CC-002 — best-effort klant-mail. Eigen try/catch in notify*; extra
  // .catch() hier zodat een gemiste reject alsnog niet de action laat falen.
  await notifyFeedbackStatusChanged(mutationResult.data, nextStatus, supabase).catch((err) =>
    console.error("[pmReviewAction] notify failed", err),
  );

  revalidatePath("/inbox");
  revalidatePath(`/inbox/feedback/${issueId}`);
  // Sidebar-counter zit in de root-layout.
  revalidatePath("/", "layout");
  return { success: true };
}
