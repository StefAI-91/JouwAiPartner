/**
 * HF-001: Portal-RLS regressietest voor emails + email_projects +
 * email_extractions.
 *
 * Vóór HF-001 hadden alle drie de tabellen alleen permissive `USING (true)`
 * policies — een portal-client kon letterlijk elke email in het systeem lezen,
 * ongeacht zijn portal_project_access. Deze test verifieert dat die gap dicht
 * is: client ziet ALLEEN verified emails gelinkt aan projecten waarop ze
 * portal-access hebben.
 *
 * Patroon van `rls-project-access.test.ts` (DH-017): echte
 * `auth.admin.createUser` + `signInWithPassword` zodat RLS daadwerkelijk
 * evalueert.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { describeWithDb } from "./helpers/describe-with-db";
import { getTestClient } from "./helpers/test-client";

// All-hex UUIDs scoped to deze test ("hf010000" = HF-001 marker)
const RLS_IDS = {
  orgA: "hf010000-0000-0000-0000-0000000000aa",
  projectA: "hf010000-0000-0000-0000-000000000001",
  projectB: "hf010000-0000-0000-0000-000000000002",
  googleAccount: "hf010000-0000-0000-0000-000000000003",
  emailA: "hf010000-0000-0000-0000-00000000000a",
  emailB: "hf010000-0000-0000-0000-00000000000b",
  emailADraft: "hf010000-0000-0000-0000-00000000000c",
  extractionA: "hf010000-0000-0000-0000-0000000000da",
  extractionB: "hf010000-0000-0000-0000-0000000000db",
} as const;

const PASSWORD = "rls-test-password-hf001-secure";

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
  role: "admin" | "member" | "client",
): Promise<{ id: string; email: string }> {
  const email = `rls-hf001-${label}-${Date.now()}@test.local`;
  const { data, error } = await svc.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: `RLS ${label}` },
  });
  if (error || !data?.user?.id) throw new Error(`createUser failed: ${error?.message}`);

  const id = data.user.id;
  // Trigger maakt profiel aan met role='member'. Update indien nodig.
  if (role !== "member") {
    const { error: upd } = await svc.from("profiles").update({ role }).eq("id", id);
    if (upd) throw new Error(`profile role update failed: ${upd.message}`);
  }
  return { id, email };
}

describeWithDb("RLS: emails portal access (HF-001)", () => {
  let svc: ReturnType<typeof getTestClient>;

  let admin: { id: string; email: string };
  let member: { id: string; email: string };
  let client: { id: string; email: string };

  let adminClient: SupabaseClient;
  let memberClient: SupabaseClient;
  let clientClient: SupabaseClient;

  beforeAll(async () => {
    svc = getTestClient();

    // ── Clean stale data ──
    await svc
      .from("email_extractions")
      .delete()
      .in("id", [RLS_IDS.extractionA, RLS_IDS.extractionB]);
    await svc
      .from("email_projects")
      .delete()
      .in("email_id", [RLS_IDS.emailA, RLS_IDS.emailB, RLS_IDS.emailADraft]);
    await svc
      .from("emails")
      .delete()
      .in("id", [RLS_IDS.emailA, RLS_IDS.emailB, RLS_IDS.emailADraft]);
    await svc.from("google_accounts").delete().eq("id", RLS_IDS.googleAccount);
    await svc
      .from("portal_project_access")
      .delete()
      .in("project_id", [RLS_IDS.projectA, RLS_IDS.projectB]);
    await svc.from("projects").delete().in("id", [RLS_IDS.projectA, RLS_IDS.projectB]);
    await svc.from("organizations").delete().eq("id", RLS_IDS.orgA);

    // ── Org + projects ──
    const { error: orgErr } = await svc
      .from("organizations")
      .insert({ id: RLS_IDS.orgA, name: "RLS HF-001 Org", type: "client", status: "active" });
    if (orgErr) throw new Error(`org seed: ${orgErr.message}`);

    const { error: projErr } = await svc.from("projects").insert([
      {
        id: RLS_IDS.projectA,
        name: "RLS HF-001 Project A",
        status: "in_progress",
        organization_id: RLS_IDS.orgA,
      },
      {
        id: RLS_IDS.projectB,
        name: "RLS HF-001 Project B",
        status: "in_progress",
        organization_id: RLS_IDS.orgA,
      },
    ]);
    if (projErr) throw new Error(`projects seed: ${projErr.message}`);

    // ── Users ──
    admin = await seedUser(svc, "admin", "admin");
    member = await seedUser(svc, "member", "member");
    client = await seedUser(svc, "client", "client");

    // Client krijgt portal-access op project A (niet op project B).
    const { error: accErr } = await svc
      .from("portal_project_access")
      .insert({ profile_id: client.id, project_id: RLS_IDS.projectA });
    if (accErr) throw new Error(`portal access seed: ${accErr.message}`);

    // ── Google account (FK voor emails) ──
    const { error: gaErr } = await svc.from("google_accounts").insert({
      id: RLS_IDS.googleAccount,
      profile_id: admin.id,
      email: "rls-hf001@test.local",
      access_token: "x",
      refresh_token: "x",
      token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      is_active: true,
    });
    if (gaErr) throw new Error(`google_accounts seed: ${gaErr.message}`);

    // ── Emails: A = verified + project A, ADraft = draft + project A, B = verified + project B ──
    const { error: emailErr } = await svc.from("emails").insert([
      {
        id: RLS_IDS.emailA,
        google_account_id: RLS_IDS.googleAccount,
        gmail_id: "rls-hf001-a",
        thread_id: "t-a",
        subject: "RLS A verified",
        from_address: "a@example.com",
        date: new Date().toISOString(),
        verification_status: "verified",
      },
      {
        id: RLS_IDS.emailADraft,
        google_account_id: RLS_IDS.googleAccount,
        gmail_id: "rls-hf001-a-draft",
        thread_id: "t-a-draft",
        subject: "RLS A draft",
        from_address: "a@example.com",
        date: new Date().toISOString(),
        verification_status: "draft",
      },
      {
        id: RLS_IDS.emailB,
        google_account_id: RLS_IDS.googleAccount,
        gmail_id: "rls-hf001-b",
        thread_id: "t-b",
        subject: "RLS B verified",
        from_address: "b@example.com",
        date: new Date().toISOString(),
        verification_status: "verified",
      },
    ]);
    if (emailErr) throw new Error(`emails seed: ${emailErr.message}`);

    const { error: epErr } = await svc.from("email_projects").insert([
      { email_id: RLS_IDS.emailA, project_id: RLS_IDS.projectA, source: "manual" },
      { email_id: RLS_IDS.emailADraft, project_id: RLS_IDS.projectA, source: "manual" },
      { email_id: RLS_IDS.emailB, project_id: RLS_IDS.projectB, source: "manual" },
    ]);
    if (epErr) throw new Error(`email_projects seed: ${epErr.message}`);

    const { error: exErr } = await svc.from("email_extractions").insert([
      {
        id: RLS_IDS.extractionA,
        email_id: RLS_IDS.emailA,
        type: "decision",
        content: "RLS HF-001 extraction A (verified + project A)",
        project_id: RLS_IDS.projectA,
        verification_status: "verified",
      },
      {
        id: RLS_IDS.extractionB,
        email_id: RLS_IDS.emailB,
        type: "decision",
        content: "RLS HF-001 extraction B (verified + project B)",
        project_id: RLS_IDS.projectB,
        verification_status: "verified",
      },
    ]);
    if (exErr) throw new Error(`email_extractions seed: ${exErr.message}`);

    // ── Auth ──
    adminClient = await createUserClient(admin.email);
    memberClient = await createUserClient(member.email);
    clientClient = await createUserClient(client.email);
  }, 60_000);

  afterAll(async () => {
    await svc
      .from("email_extractions")
      .delete()
      .in("id", [RLS_IDS.extractionA, RLS_IDS.extractionB]);
    await svc
      .from("email_projects")
      .delete()
      .in("email_id", [RLS_IDS.emailA, RLS_IDS.emailB, RLS_IDS.emailADraft]);
    await svc
      .from("emails")
      .delete()
      .in("id", [RLS_IDS.emailA, RLS_IDS.emailB, RLS_IDS.emailADraft]);
    await svc.from("google_accounts").delete().eq("id", RLS_IDS.googleAccount);
    await svc
      .from("portal_project_access")
      .delete()
      .in("project_id", [RLS_IDS.projectA, RLS_IDS.projectB]);
    await svc.from("projects").delete().in("id", [RLS_IDS.projectA, RLS_IDS.projectB]);
    await svc.from("organizations").delete().eq("id", RLS_IDS.orgA);
    if (admin) await svc.auth.admin.deleteUser(admin.id).catch(() => {});
    if (member) await svc.auth.admin.deleteUser(member.id).catch(() => {});
    if (client) await svc.auth.admin.deleteUser(client.id).catch(() => {});
  }, 60_000);

  // =========================================================================
  // emails SELECT
  // =========================================================================
  describe("emails SELECT", () => {
    it("admin sees all 3 seeded emails", async () => {
      const { data, error } = await adminClient
        .from("emails")
        .select("id")
        .in("id", [RLS_IDS.emailA, RLS_IDS.emailADraft, RLS_IDS.emailB]);
      expect(error).toBeNull();
      const ids = (data ?? []).map((r) => r.id);
      expect(ids).toContain(RLS_IDS.emailA);
      expect(ids).toContain(RLS_IDS.emailADraft);
      expect(ids).toContain(RLS_IDS.emailB);
    });

    it("member sees all 3 seeded emails (enterprise scope unchanged)", async () => {
      const { data, error } = await memberClient
        .from("emails")
        .select("id")
        .in("id", [RLS_IDS.emailA, RLS_IDS.emailADraft, RLS_IDS.emailB]);
      expect(error).toBeNull();
      const ids = (data ?? []).map((r) => r.id);
      expect(ids).toContain(RLS_IDS.emailA);
      expect(ids).toContain(RLS_IDS.emailADraft);
      expect(ids).toContain(RLS_IDS.emailB);
    });

    it("client sees ONLY verified email on their portal project (A)", async () => {
      const { data, error } = await clientClient
        .from("emails")
        .select("id, verification_status")
        .in("id", [RLS_IDS.emailA, RLS_IDS.emailADraft, RLS_IDS.emailB]);
      expect(error).toBeNull();
      const ids = (data ?? []).map((r) => r.id);
      expect(ids).toEqual([RLS_IDS.emailA]);
    });

    it("client does NOT see draft email even on their project", async () => {
      const { data, error } = await clientClient
        .from("emails")
        .select("id")
        .eq("id", RLS_IDS.emailADraft);
      expect(error).toBeNull();
      expect(data ?? []).toEqual([]);
    });

    it("client does NOT see verified email on other project (B)", async () => {
      const { data, error } = await clientClient
        .from("emails")
        .select("id")
        .eq("id", RLS_IDS.emailB);
      expect(error).toBeNull();
      expect(data ?? []).toEqual([]);
    });
  });

  // =========================================================================
  // emails write (clients blocked)
  // =========================================================================
  describe("emails INSERT/UPDATE/DELETE (clients blocked)", () => {
    it("client cannot INSERT email", async () => {
      const { error } = await clientClient.from("emails").insert({
        google_account_id: RLS_IDS.googleAccount,
        gmail_id: "client-tries",
        thread_id: "t-client",
        subject: "Client insert attempt",
        from_address: "x@x.com",
        date: new Date().toISOString(),
      });
      expect(error).not.toBeNull();
    });

    it("client cannot UPDATE email", async () => {
      const { data, error } = await clientClient
        .from("emails")
        .update({ subject: "hacked" })
        .eq("id", RLS_IDS.emailA)
        .select();
      // RLS filters affected rows to 0 (no error + empty), OR blocked met error
      const changed = error === null ? (data ?? []).length : 0;
      expect(changed).toBe(0);
    });
  });

  // =========================================================================
  // email_projects SELECT
  // =========================================================================
  describe("email_projects SELECT", () => {
    it("client sees only link rows for their portal projects", async () => {
      const { data, error } = await clientClient
        .from("email_projects")
        .select("email_id, project_id")
        .in("email_id", [RLS_IDS.emailA, RLS_IDS.emailADraft, RLS_IDS.emailB]);
      expect(error).toBeNull();
      const rows = data ?? [];
      // Client mag project-A-links zien (inclusief ADraft — link bestaat, maar emails-RLS
      // filtert ADraft zelf weg). Client ziet GEEN project-B-links.
      expect(rows.every((r) => r.project_id === RLS_IDS.projectA)).toBe(true);
      expect(rows.some((r) => r.email_id === RLS_IDS.emailB)).toBe(false);
    });

    it("admin sees all 3 link rows", async () => {
      const { data, error } = await adminClient
        .from("email_projects")
        .select("email_id")
        .in("email_id", [RLS_IDS.emailA, RLS_IDS.emailADraft, RLS_IDS.emailB]);
      expect(error).toBeNull();
      expect((data ?? []).length).toBe(3);
    });
  });

  // =========================================================================
  // email_extractions SELECT
  // =========================================================================
  describe("email_extractions SELECT", () => {
    it("client sees only verified extractions on portal projects", async () => {
      const { data, error } = await clientClient
        .from("email_extractions")
        .select("id")
        .in("id", [RLS_IDS.extractionA, RLS_IDS.extractionB]);
      expect(error).toBeNull();
      const ids = (data ?? []).map((r) => r.id);
      expect(ids).toEqual([RLS_IDS.extractionA]);
    });

    it("admin sees both extractions", async () => {
      const { data, error } = await adminClient
        .from("email_extractions")
        .select("id")
        .in("id", [RLS_IDS.extractionA, RLS_IDS.extractionB]);
      expect(error).toBeNull();
      const ids = (data ?? []).map((r) => r.id);
      expect(ids).toContain(RLS_IDS.extractionA);
      expect(ids).toContain(RLS_IDS.extractionB);
    });
  });
});
