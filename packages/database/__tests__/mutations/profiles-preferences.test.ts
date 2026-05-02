import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { describeWithDb } from "../helpers/describe-with-db";
import { getTestClient } from "../helpers/test-client";
import { seedProfile } from "../helpers/seed";
import { cleanupTestProfile } from "../helpers/cleanup";
import { dismissOnboarding } from "../../src/mutations/profiles";
import { getProfilePreferences } from "../../src/queries/profiles";

// CC-005 — bewaakt twee dingen:
//   1. dismissOnboarding zet de juiste key met een ISO-timestamp
//   2. dismissOnboarding overschrijft GEEN andere keys in `preferences`
// Dat tweede risico is de hoofdreden dat we de RPC met jsonb_set gebruiken
// i.p.v. een full-row update.

let db: ReturnType<typeof getTestClient>;
let profileId: string;

describeWithDb("mutations/profiles — dismissOnboarding", () => {
  beforeAll(async () => {
    db = getTestClient();
    const profile = await seedProfile({ full_name: "CC-005 Preferences Test" });
    profileId = profile.id;
    // Reset preferences naar lege staat zodat eerdere runs de test niet
    // beïnvloeden.
    await db.from("profiles").update({ preferences: {} }).eq("id", profileId);
  });

  afterAll(async () => {
    await cleanupTestProfile(profileId);
  });

  it("zet dismissed_onboarding.portal_inbox met ISO-timestamp", async () => {
    const result = await dismissOnboarding(profileId, "portal_inbox", db);
    if ("error" in result) throw new Error(result.error);

    const prefs = await getProfilePreferences(profileId, db);
    expect(prefs.dismissed_onboarding?.portal_inbox).toBeDefined();
    // ISO-string check — start met YYYY-, parsed als geldige datum.
    const ts = prefs.dismissed_onboarding!.portal_inbox!;
    expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(Number.isFinite(Date.parse(ts))).toBe(true);
  });

  it("dismissal van cockpit_inbox overschrijft portal_inbox NIET", async () => {
    // portal_inbox is gezet door de vorige test
    const portalBefore = (await getProfilePreferences(profileId, db)).dismissed_onboarding
      ?.portal_inbox;
    expect(portalBefore).toBeDefined();

    await dismissOnboarding(profileId, "cockpit_inbox", db);

    const after = await getProfilePreferences(profileId, db);
    expect(after.dismissed_onboarding?.portal_inbox).toBe(portalBefore);
    expect(after.dismissed_onboarding?.cockpit_inbox).toBeDefined();
  });

  it("bewaart andere preferences-keys (geen sloop bij future-key)", async () => {
    // Zet een toekomstige key handmatig (zoals een latere sprint zou doen).
    await db
      .from("profiles")
      .update({
        preferences: {
          theme: "dark",
          dismissed_onboarding: { portal_inbox: "2026-01-01T00:00:00.000Z" },
        },
      })
      .eq("id", profileId);

    await dismissOnboarding(profileId, "cockpit_inbox", db);

    const { data } = await db.from("profiles").select("preferences").eq("id", profileId).single();
    expect((data?.preferences as Record<string, unknown>).theme).toBe("dark");
    const dismissed = (data?.preferences as { dismissed_onboarding: Record<string, string> })
      .dismissed_onboarding;
    expect(dismissed.portal_inbox).toBe("2026-01-01T00:00:00.000Z");
    expect(dismissed.cockpit_inbox).toBeDefined();
  });

  it("retourneert error voor onbekende key (Zod-validatie)", async () => {
    // @ts-expect-error — bewust verkeerd type om de Zod-guard te testen
    const result = await dismissOnboarding(profileId, "evil_key", db);
    expect("error" in result).toBe(true);
  });
});
