"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@repo/database/supabase/server";
import { getCurrentProfile } from "@repo/auth/access";
import { dismissOnboarding } from "@repo/database/mutations/profiles";
import { dismissOnboardingInputSchema } from "@repo/database/validations/profiles";

// CC-005 — server-action voor het persisteren van de dismissed cockpit-inbox-
// onboarding-card. Spiegelt de portal-versie maar gebruikt key `cockpit_inbox`
// zodat een team-member die zowel inbox-views opent maar één keer hoeft te
// dismissen per quadrant.

export type DismissOnboardingResult = { success: true } | { error: string };

export async function dismissOnboardingAction(input: unknown): Promise<DismissOnboardingResult> {
  const parsed = dismissOnboardingInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (!profile) return { error: "Niet ingelogd" };

  const result = await dismissOnboarding(profile.id, parsed.data.key, supabase);
  if ("error" in result) return { error: result.error };

  // CC-007 — `revalidatePath("/(dashboard)", "layout")` was fout: route-groepen
  // (`(dashboard)`) zijn *geen* URL-pad in Next.js, dus die call werd silent
  // geskipt en de onboarding-card bleef hangen tot een full reload. Inbox
  // staat zowel globaal als per project; beide routes nu expliciet revalideren.
  revalidatePath("/inbox");
  revalidatePath("/projects/[id]/inbox", "page");
  return { success: true };
}
