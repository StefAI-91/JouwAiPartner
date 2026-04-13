/**
 * DH-017: RLS integration tests for DevHub project-access.
 *
 * Test matrix: for each of (issues, issue_comments, issue_activity,
 * devhub_project_access) and each CRUD op, verify:
 *   - admin sees/writes everything
 *   - member-with-access sees/writes only their project
 *   - member-without-access sees/writes nothing
 *
 * Runs against the shared test Supabase instance (same pattern as queries/*).
 * Uses dedicated test profiles created via auth.admin.createUser and signed-in
 * anon clients to actually hit RLS (service-role bypasses it).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { describeWithDb } from "./helpers/describe-with-db";
import { getTestClient } from "./helpers/test-client";

// Unique IDs for this test run (kept outside TEST_IDS to avoid collision with
// other test suites that delete those IDs in afterEach).
// All-hex UUIDs scoped to this test file to avoid collision with TEST_IDS
// (other suites delete those in afterEach). "d017xxxx" = DH-017 marker.
const RLS_IDS = {
  projectA: "d0170000-0000-0000-0000-000000000001",
  projectB: "d0170000-0000-0000-0000-000000000002",
  orgA: "d0170000-0000-0000-0000-0000000000aa",
  issueA: "d0170000-0000-0000-0000-0000000000bb",
  issueB: "d0170000-0000-0000-0000-0000000000cc",
} as const;

const PASSWORD = "rls-test-password-dh017-secure";

async function createUserClient(email: string): Promise<SupabaseClient> {
  const url = process.env.TEST_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.TEST_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return client;
}

async function seedUser(
  svc: SupabaseClient,
  label: string,
  role: "admin" | "member",
): Promise<{ id: string; email: string }> {
  const email = `rls-dh017-${label}-${Date.now()}@test.local`;
  const { data, error } = await svc.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: `RLS ${label}` },
  });
  if (error || !data?.user?.id) throw new Error(`createUser failed: ${error?.message}`);

  const id = data.user.id;
  // Trigger auto-creates profile with role='member' default; bump to admin if needed.
  if (role === "admin") {
    const { error: upd } = await svc.from("profiles").update({ role: "admin" }).eq("id", id);
    if (upd) throw new Error(`profile role update failed: ${upd.message}`);
  }
  return { id, email };
}

describeWithDb("RLS: DevHub project access (DH-017)", () => {
  const svc = getTestClient();

  let admin: { id: string; email: string };
  let memberA: { id: string; email: string };
  let memberB: { id: string; email: string };

  let adminClient: SupabaseClient;
  let memberAClient: SupabaseClient;
  let memberBClient: SupabaseClient;

  beforeAll(async () => {
    // ── Clean any stale rows from prior runs ──
    await svc.from("issue_activity").delete().in("issue_id", [RLS_IDS.issueA, RLS_IDS.issueB]);
    await svc.from("issue_comments").delete().in("issue_id", [RLS_IDS.issueA, RLS_IDS.issueB]);
    await svc.from("issues").delete().in("id", [RLS_IDS.issueA, RLS_IDS.issueB]);
    await svc
      .from("devhub_project_access")
      .delete()
      .in("project_id", [RLS_IDS.projectA, RLS_IDS.projectB]);
    await svc.from("projects").delete().in("id", [RLS_IDS.projectA, RLS_IDS.projectB]);
    await svc.from("organizations").delete().eq("id", RLS_IDS.orgA);

    // ── Seed org + 2 projects ──
    const { error: orgErr } = await svc
      .from("organizations")
      .insert({ id: RLS_IDS.orgA, name: "RLS DH-017 Org", type: "client", status: "active" });
    if (orgErr) throw new Error(`org seed: ${orgErr.message}`);

    const { error: projErr } = await svc.from("projects").insert([
      {
        id: RLS_IDS.projectA,
        name: "RLS Project A",
        status: "in_progress",
        organization_id: RLS_IDS.orgA,
      },
      {
        id: RLS_IDS.projectB,
        name: "RLS Project B",
        status: "in_progress",
        organization_id: RLS_IDS.orgA,
      },
    ]);
    if (projErr) throw new Error(`projects seed: ${projErr.message}`);

    // ── Seed users ──
    admin = await seedUser(svc, "admin", "admin");
    memberA = await seedUser(svc, "memberA", "member");
    memberB = await seedUser(svc, "memberB", "member");

    // Grant memberA access to projectA only.
    const { error: accErr } = await svc
      .from("devhub_project_access")
      .insert({ profile_id: memberA.id, project_id: RLS_IDS.projectA });
    if (accErr) throw new Error(`access seed: ${accErr.message}`);

    // ── Seed an issue in each project (via service role; RLS bypassed) ──
    const { data: numA } = await svc.rpc("next_issue_number", { p_project_id: RLS_IDS.projectA });
    const { data: numB } = await svc.rpc("next_issue_number", { p_project_id: RLS_IDS.projectB });
    const { error: issErr } = await svc.from("issues").insert([
      {
        id: RLS_IDS.issueA,
        project_id: RLS_IDS.projectA,
        title: "RLS issue A",
        type: "bug",
        status: "triage",
        priority: "medium",
        source: "manual",
        issue_number: numA,
      },
      {
        id: RLS_IDS.issueB,
        project_id: RLS_IDS.projectB,
        title: "RLS issue B",
        type: "bug",
        status: "triage",
        priority: "medium",
        source: "manual",
        issue_number: numB,
      },
    ]);
    if (issErr) throw new Error(`issues seed: ${issErr.message}`);

    // ── Authenticate as each user ──
    adminClient = await createUserClient(admin.email);
    memberAClient = await createUserClient(memberA.email);
    memberBClient = await createUserClient(memberB.email);
  }, 60_000);

  afterAll(async () => {
    await svc.from("issue_activity").delete().in("issue_id", [RLS_IDS.issueA, RLS_IDS.issueB]);
    await svc.from("issue_comments").delete().in("issue_id", [RLS_IDS.issueA, RLS_IDS.issueB]);
    await svc.from("issues").delete().in("id", [RLS_IDS.issueA, RLS_IDS.issueB]);
    await svc
      .from("devhub_project_access")
      .delete()
      .in("project_id", [RLS_IDS.projectA, RLS_IDS.projectB]);
    await svc.from("projects").delete().in("id", [RLS_IDS.projectA, RLS_IDS.projectB]);
    await svc.from("organizations").delete().eq("id", RLS_IDS.orgA);
    if (admin) await svc.auth.admin.deleteUser(admin.id).catch(() => {});
    if (memberA) await svc.auth.admin.deleteUser(memberA.id).catch(() => {});
    if (memberB) await svc.auth.admin.deleteUser(memberB.id).catch(() => {});
  }, 60_000);

  // =========================================================================
  // SEC-170: issues SELECT
  // =========================================================================
  describe("issues SELECT (SEC-170)", () => {
    it("admin sees both seeded issues", async () => {
      const { data, error } = await adminClient
        .from("issues")
        .select("id")
        .in("id", [RLS_IDS.issueA, RLS_IDS.issueB]);
      expect(error).toBeNull();
      const ids = (data ?? []).map((r) => r.id);
      expect(ids).toContain(RLS_IDS.issueA);
      expect(ids).toContain(RLS_IDS.issueB);
    });

    it("member with access sees only accessible issue", async () => {
      const { data, error } = await memberAClient
        .from("issues")
        .select("id")
        .in("id", [RLS_IDS.issueA, RLS_IDS.issueB]);
      expect(error).toBeNull();
      const ids = (data ?? []).map((r) => r.id);
      expect(ids).toEqual([RLS_IDS.issueA]);
    });

    it("member without access sees no issues", async () => {
      const { data, error } = await memberBClient
        .from("issues")
        .select("id")
        .in("id", [RLS_IDS.issueA, RLS_IDS.issueB]);
      expect(error).toBeNull();
      expect(data ?? []).toEqual([]);
    });
  });

  // =========================================================================
  // SEC-171: issues INSERT
  // =========================================================================
  describe("issues INSERT (SEC-171)", () => {
    it("admin can insert into any project", async () => {
      const { data: num } = await svc.rpc("next_issue_number", {
        p_project_id: RLS_IDS.projectB,
      });
      const { error } = await adminClient.from("issues").insert({
        project_id: RLS_IDS.projectB,
        title: "admin insert",
        type: "bug",
        status: "triage",
        priority: "low",
        source: "manual",
        issue_number: num,
      });
      expect(error).toBeNull();
      await svc.from("issues").delete().eq("title", "admin insert");
    });

    it("member with access can insert in accessible project", async () => {
      const { data: num } = await svc.rpc("next_issue_number", {
        p_project_id: RLS_IDS.projectA,
      });
      const { error } = await memberAClient.from("issues").insert({
        project_id: RLS_IDS.projectA,
        title: "memberA insert",
        type: "bug",
        status: "triage",
        priority: "low",
        source: "manual",
        issue_number: num,
      });
      expect(error).toBeNull();
      await svc.from("issues").delete().eq("title", "memberA insert");
    });

    it("member without access cannot insert", async () => {
      const { data: num } = await svc.rpc("next_issue_number", {
        p_project_id: RLS_IDS.projectA,
      });
      const { error } = await memberBClient.from("issues").insert({
        project_id: RLS_IDS.projectA,
        title: "memberB insert",
        type: "bug",
        status: "triage",
        priority: "low",
        source: "manual",
        issue_number: num,
      });
      expect(error).not.toBeNull();
    });
  });

  // =========================================================================
  // SEC-172: issues UPDATE (incl. project_id relocation guard)
  // =========================================================================
  describe("issues UPDATE (SEC-172)", () => {
    it("member with access can update accessible issue", async () => {
      const { error } = await memberAClient
        .from("issues")
        .update({ title: "memberA updated" })
        .eq("id", RLS_IDS.issueA);
      expect(error).toBeNull();
      // restore
      await svc.from("issues").update({ title: "RLS issue A" }).eq("id", RLS_IDS.issueA);
    });

    it("member without access cannot update", async () => {
      const { data, error } = await memberBClient
        .from("issues")
        .update({ title: "memberB updated" })
        .eq("id", RLS_IDS.issueA)
        .select();
      // RLS filters affected rows to 0 (no error, empty result) OR returns error
      expect(error === null ? (data ?? []).length : 0).toBe(0);
    });

    it("member cannot move issue to inaccessible project (SEC-172)", async () => {
      // memberA has access to projectA but NOT projectB.
      const { data, error } = await memberAClient
        .from("issues")
        .update({ project_id: RLS_IDS.projectB })
        .eq("id", RLS_IDS.issueA)
        .select();

      // WITH CHECK on new project_id must fail → error, OR result is empty (no
      // row survived both USING and WITH CHECK).
      const moved = error === null ? (data ?? []).length > 0 : false;
      expect(moved).toBe(false);

      // Verify no actual change happened.
      const { data: after } = await svc
        .from("issues")
        .select("project_id")
        .eq("id", RLS_IDS.issueA)
        .single();
      expect(after?.project_id).toBe(RLS_IDS.projectA);
    });
  });

  // =========================================================================
  // SEC-173 / SEC-174: issue_comments
  // =========================================================================
  describe("issue_comments (SEC-173, SEC-174)", () => {
    it("member with access can insert+read comments on accessible issue", async () => {
      const { error: insErr } = await memberAClient.from("issue_comments").insert({
        issue_id: RLS_IDS.issueA,
        author_id: memberA.id,
        body: "memberA comment",
      });
      expect(insErr).toBeNull();

      const { data, error } = await memberAClient
        .from("issue_comments")
        .select("body")
        .eq("issue_id", RLS_IDS.issueA);
      expect(error).toBeNull();
      expect((data ?? []).some((c) => c.body === "memberA comment")).toBe(true);

      await svc.from("issue_comments").delete().eq("body", "memberA comment");
    });

    it("member without access cannot insert comment", async () => {
      const { error } = await memberBClient.from("issue_comments").insert({
        issue_id: RLS_IDS.issueA,
        author_id: memberB.id,
        body: "memberB comment",
      });
      expect(error).not.toBeNull();
    });

    it("member without access sees no comments", async () => {
      await svc.from("issue_comments").insert({
        issue_id: RLS_IDS.issueA,
        author_id: admin.id,
        body: "admin seeded comment",
      });

      const { data, error } = await memberBClient
        .from("issue_comments")
        .select("id")
        .eq("issue_id", RLS_IDS.issueA);
      expect(error).toBeNull();
      expect(data ?? []).toEqual([]);

      await svc.from("issue_comments").delete().eq("body", "admin seeded comment");
    });
  });

  // =========================================================================
  // SEC-175: issue_activity
  // =========================================================================
  describe("issue_activity (SEC-175)", () => {
    it("member with access can read activity on accessible issue", async () => {
      await svc.from("issue_activity").insert({
        issue_id: RLS_IDS.issueA,
        actor_id: admin.id,
        action: "status_changed",
        field: "status",
        old_value: "triage",
        new_value: "backlog",
        metadata: {},
      });

      const { data, error } = await memberAClient
        .from("issue_activity")
        .select("id")
        .eq("issue_id", RLS_IDS.issueA);
      expect(error).toBeNull();
      expect((data ?? []).length).toBeGreaterThanOrEqual(1);
    });

    it("member without access sees no activity", async () => {
      const { data, error } = await memberBClient
        .from("issue_activity")
        .select("id")
        .eq("issue_id", RLS_IDS.issueA);
      expect(error).toBeNull();
      expect(data ?? []).toEqual([]);
    });
  });

  // =========================================================================
  // SEC-176 / SEC-177: devhub_project_access
  // =========================================================================
  describe("devhub_project_access (SEC-176, SEC-177)", () => {
    it("admin reads all access rows", async () => {
      const { data, error } = await adminClient
        .from("devhub_project_access")
        .select("id")
        .eq("project_id", RLS_IDS.projectA);
      expect(error).toBeNull();
      expect((data ?? []).length).toBeGreaterThanOrEqual(1);
    });

    it("member reads only own access rows", async () => {
      const { data, error } = await memberAClient
        .from("devhub_project_access")
        .select("profile_id");
      expect(error).toBeNull();
      for (const row of data ?? []) {
        expect(row.profile_id).toBe(memberA.id);
      }
    });

    it("non-admin cannot insert access row", async () => {
      const { error } = await memberAClient.from("devhub_project_access").insert({
        profile_id: memberB.id,
        project_id: RLS_IDS.projectA,
      });
      expect(error).not.toBeNull();
    });

    it("admin can insert access row", async () => {
      const { error } = await adminClient.from("devhub_project_access").insert({
        profile_id: memberB.id,
        project_id: RLS_IDS.projectA,
      });
      expect(error).toBeNull();
      await svc
        .from("devhub_project_access")
        .delete()
        .eq("profile_id", memberB.id)
        .eq("project_id", RLS_IDS.projectA);
    });
  });
});
