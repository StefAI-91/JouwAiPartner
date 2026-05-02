import { z } from "zod";

// CC-005 — Profile preferences zijn per-user UI-state opgeslagen als jsonb.
// Schema is bewust open (extra keys passeren `passthrough`) zodat sprint-na-
// sprint nieuwe keys toegevoegd kunnen worden zonder type-breakage. Bekende
// keys worden hier expliciet getypeerd.

export const ONBOARDING_KEYS = ["portal_inbox", "cockpit_inbox"] as const;
export type OnboardingKey = (typeof ONBOARDING_KEYS)[number];

export const dismissedOnboardingSchema = z
  .object({
    portal_inbox: z.string().datetime().optional(),
    cockpit_inbox: z.string().datetime().optional(),
  })
  .partial();

export const profilePreferencesSchema = z
  .object({
    dismissed_onboarding: dismissedOnboardingSchema.optional(),
  })
  .passthrough();

export type ProfilePreferences = z.infer<typeof profilePreferencesSchema>;

export const dismissOnboardingInputSchema = z.object({
  key: z.enum(ONBOARDING_KEYS),
});

export type DismissOnboardingInput = z.infer<typeof dismissOnboardingInputSchema>;
