/**
 * CC-006 / CC-008 — RLS-integration-test voor klant-root-INSERT op
 * `client_questions`. Verifieert dat de policies uit migratie
 * `20260503100000_cc006_client_root_messages.sql` + de fix uit
 * `20260503110000_cc006_fix_recursive_policy.sql` werken zoals beschreven:
 *
 *   1. klant A in project A1 kan eigen root-message inserten ✅
 *   2. klant A kan géén root-message inserten op project B1 (andere org) ❌
 *   3. klant A kan géén root-message inserten op project A2 zonder portal-assignment ❌
 *   4. klant A kan reply lezen die team in zelfde project verstuurd heeft ✅
 *
 * Patroon volgt `client-questions.test.ts` (PR-022) — echte
 * `auth.admin.createUser` + `signInWithPassword` zodat RLS evalueert.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { describeWithDb } from "../helpers/describe-with-db";
import { getTestClient } from "../helpers/test-client";

const CC006_IDS = {
  orgA: "cc006a00-0000-4006-8000-0000000000aa",
  orgB: "cc006a00-0000-4006-8000-0000000000bb",
  // projectA1 = klant A heeft portal-access; projectA2 = same org, géén access.
  projectA1: "cc006a00-0000-4006-8000-000000000001",
  projectA2: "cc006a00-0000-4006-8000-000000000002",
  projectB1: "cc006a00-0000-4006-8000-000000000003",
} as const;

const PASSWORD = "cc006-test-password-secure";

async function createUserClient(email: string): Promise<SupabaseClient> {
  const url = process.env.TEST_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.TEST_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const c = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return c;
}

async function ensureUser(
  svc: SupabaseClient,
  email: string,
  role: "admin" | "member" | "client",
  organizationId?: string,
): Promise<{ id: string; email: string }> {
  const { data: created } = await svc.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: `CC006 ${role}` },
  });
  let id = created?.user?.id ?? null;
  if (!id) {
    const { data: list } = await svc.auth.admin.listUsers();
    id = list?.users?.find((u) => u.email === email)?.id ?? null;
  }
  if (!id) throw new Error(`failed to seed user ${email}`);

  const patch: Record<string, unknown> = { role };
  if (organizationId !== undefined) patch.organization_id = organizationId;
  const { error: roleErr } = await svc.from("profiles").update(patch).eq("id", id);
  if (roleErr) throw new Error(`profile update failed: ${roleErr.message}`);
  return { id, email };
}

describeWithDb("CC-006 — klant-root-INSERT RLS", () => {
  let svc: ReturnType<typeof getTestClient>;
  let teamMember: { id: string; email: string };
  let clientA: { id: string; email: string };
  let clientAClient: SupabaseClient;
  let teamClient: SupabaseClient;

  const allProjects = [CC006_IDS.projectA1, CC006_IDS.projectA2, CC006_IDS.projectB1];

  async function cleanup() {
    await svc.from("client_questions").delete().in("project_id", allProjects);
    await svc.from("portal_project_access").delete().in("project_id", allProjects);
    await svc.from("projects").delete().in("id", allProjects);
    await svc.from("organizations").delete().in("id", [CC006_IDS.orgA, CC006_IDS.orgB]);
  }

  beforeAll(async () => {
    svc = getTestClient();
    await cleanup();

    const { error: orgErr } = await svc.from("organizations").insert([
      { id: CC006_IDS.orgA, name: "CC006 Org A", type: "client", status: "active" },
      { id: CC006_IDS.orgB, name: "CC006 Org B", type: "client", status: "active" },
    ]);
    if (orgErr) throw new Error(`org seed: ${orgErr.message}`);

    const { error: projErr } = await svc.from("projects").insert([
      {
        id: CC006_IDS.projectA1,
        name: "CC006 A1 (klant heeft access)",
        status: "in_progress",
        organization_id: CC006_IDS.orgA,
      },
      {
        id: CC006_IDS.projectA2,
        name: "CC006 A2 (zelfde org, geen access)",
        status: "in_progress",
        organization_id: CC006_IDS.orgA,
      },
      {
        id: CC006_IDS.projectB1,
        name: "CC006 B1 (andere org)",
        status: "in_progress",
        organization_id: CC006_IDS.orgB,
      },
    ]);
    if (projErr) throw new Error(`project seed: ${projErr.message}`);

    teamMember = await ensureUser(svc, "cc006-team@test.local", "member");
    clientA = await ensureUser(svc, "cc006-client-a@test.local", "client", CC006_IDS.orgA);

    // Alleen access op A1, niet op A2 of B1.
    const { error: accErr } = await svc
      .from("portal_project_access")
      .insert([{ profile_id: clientA.id, project_id: CC006_IDS.projectA1 }]);
    if (accErr) throw new Error(`access seed: ${accErr.message}`);

    teamClient = await createUserClient(teamMember.email);
    clientAClient = await createUserClient(clientA.email);
  }, 60_000);

  afterAll(async () => {
    await cleanup();
    if (teamMember) await svc.auth.admin.deleteUser(teamMember.id).catch(() => {});
    if (clientA) await svc.auth.admin.deleteUser(clientA.id).catch(() => {});
  }, 60_000);

  // ───────────────────────────────────────────────────────────────────────

  describe("root-INSERT (parent_id IS NULL)", () => {
    it("klant A kan root-message inserten op project A1 (eigen project + access)", async () => {
      const { data, error } = await clientAClient
        .from("client_questions")
        .insert({
          project_id: CC006_IDS.projectA1,
          organization_id: CC006_IDS.orgA,
          sender_profile_id: clientA.id,
          body: "Klant-A vraag op A1 — RLS toelaat.",
        })
        .select("id, parent_id, status")
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data?.parent_id).toBeNull();
      expect(data?.status).toBe("open");
    });

    it("klant A kan GEEN root-message inserten op project B1 (andere org)", async () => {
      const { data, error } = await clientAClient
        .from("client_questions")
        .insert({
          project_id: CC006_IDS.projectB1,
          organization_id: CC006_IDS.orgB,
          sender_profile_id: clientA.id,
          body: "Klant-A probeert via B1 — RLS moet dit blokkeren.",
        })
        .select("id");

      // RLS WITH CHECK fail → error of empty data zonder error.
      expect(error !== null || (data?.length ?? 0) === 0).toBe(true);
    });

    it("klant A kan GEEN root-message inserten op project A2 (zelfde org, geen portal-access)", async () => {
      const { data, error } = await clientAClient
        .from("client_questions")
        .insert({
          project_id: CC006_IDS.projectA2,
          organization_id: CC006_IDS.orgA,
          sender_profile_id: clientA.id,
          body: "Klant-A probeert A2 zonder portal-access.",
        })
        .select("id");

      expect(error !== null || (data?.length ?? 0) === 0).toBe(true);
    });

    it("klant A kan organization_id NIET spoofen naar orgB op projectA1 (mismatch wordt geweigerd)", async () => {
      const { data, error } = await clientAClient
        .from("client_questions")
        .insert({
          project_id: CC006_IDS.projectA1,
          organization_id: CC006_IDS.orgB, // spoof — eigen profile zit op orgA
          sender_profile_id: clientA.id,
          body: "Klant-A probeert org-spoof.",
        })
        .select("id");

      expect(error !== null || (data?.length ?? 0) === 0).toBe(true);
    });
  });

  describe("klant SELECT op replies in eigen project", () => {
    it("klant A kan team-reply lezen op een vraag in project A1", async () => {
      // Seed: team plaatst een root-vraag, en een reply daarop.
      const { data: root, error: rootErr } = await svc
        .from("client_questions")
        .insert({
          project_id: CC006_IDS.projectA1,
          organization_id: CC006_IDS.orgA,
          sender_profile_id: teamMember.id,
          body: "Team-bericht waarop een team-reply komt.",
        })
        .select("id")
        .single();
      if (rootErr || !root) throw new Error(`root seed: ${rootErr?.message}`);

      const { data: reply, error: replyErr } = await svc
        .from("client_questions")
        .insert({
          parent_id: root.id,
          project_id: CC006_IDS.projectA1,
          organization_id: CC006_IDS.orgA,
          sender_profile_id: teamMember.id,
          body: "Team-reply die de klant moet kunnen zien.",
        })
        .select("id, parent_id")
        .single();
      if (replyErr || !reply) throw new Error(`reply seed: ${replyErr?.message}`);

      // Klant haalt op via cookie-client — RLS-pad.
      const { data: visible, error: selectErr } = await clientAClient
        .from("client_questions")
        .select("id, body, parent_id")
        .eq("id", reply.id);

      expect(selectErr).toBeNull();
      expect(visible?.length).toBe(1);
      expect(visible?.[0]?.parent_id).toBe(root.id);

      // Suppress unused-import warning when nothing else exercises teamClient.
      void teamClient;
    });
  });
});
