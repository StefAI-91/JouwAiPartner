"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@repo/database/supabase/server";
import { getCurrentProfile } from "@repo/auth/access";
import { dismissOnboarding } from "@repo/database/mutations/profiles";
import { dismissOnboardingInputSchema } from "@repo/database/validations/profiles";

// CC-005 — server-action voor het persisteren van een dismissed onboarding-
// card. Schrijft naar `profiles.preferences` via de gevalideerde mutation;
// klant kan alleen z'n eigen rij raken (RLS + profile-id uit sessie).

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

  // De inbox-page leest `preferences` opnieuw bij volgende navigatie; layout
  // revalidate is voldoende — page revalidate hoeft niet apart.
  revalidatePath("/projects", "layout");
  return { success: true };
}
