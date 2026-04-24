"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { updateEmailFilterStatus } from "@repo/database/mutations/emails";
import { getEmailForPipelineInput } from "@repo/database/queries/emails";
import { processEmail } from "@repo/ai/pipeline/email/core";
import { getAuthenticatedUser } from "@repo/auth/helpers";
import { isAdmin } from "@repo/auth/access";

const unfilterEmailSchema = z.object({
  emailId: z.string().uuid(),
});

/**
 * "Alsnog doorlaten" — haalt een gefilterde email uit de audit-tab en draait
 * de volledige email-pipeline opnieuw (classifier + entity linking + embedding),
 * met `skipFilter=true` zodat de gatekeeper hem niet opnieuw filtert.
 *
 * Flow:
 *   1. Zet filter_status='kept', reason=null (optimistisch; pipeline bevestigt)
 *   2. Haal ruwe email velden op
 *   3. processEmail(email, { skipFilter: true })
 *   4. Revalidate /emails routes
 */
export async function unfilterEmailAction(
  input: z.infer<typeof unfilterEmailSchema>,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Geen toegang" };

  const parsed = unfilterEmailSchema.safeParse(input);
  if (!parsed.success) return { error: "Ongeldige invoer" };

  // 1. Clear filter state
  const clearResult = await updateEmailFilterStatus(parsed.data.emailId, {
    filter_status: "kept",
    filter_reason: null,
  });
  if ("error" in clearResult) return clearResult;

  // 2. Fetch raw email for pipeline input
  const email = await getEmailForPipelineInput(parsed.data.emailId);
  if (!email) return { error: "Email niet gevonden" };

  // 3. Re-run full pipeline with filter bypass
  const result = await processEmail(email, { skipFilter: true });

  // 4. Revalidate views
  revalidatePath(`/emails/${parsed.data.emailId}`);
  revalidatePath("/emails");
  revalidatePath("/review");

  if (result.errors.length > 0) {
    // Pipeline had warnings maar email is wel doorgelaten — niet als error terug
    console.warn("[unfilterEmailAction] pipeline warnings:", result.errors);
  }

  return { success: true };
}
