/**
 * PR-022 — Integration tests voor `client_questions`:
 *
 *   1. Mutations (`sendQuestion`, `replyToQuestion`) — happy path + status-flip.
 *   2. DB-constraints (XOR topic_id/issue_id).
 *   3. RLS (org-isolatie + klant-root-INSERT-blokkade).
 *   4. Query (`listOpenQuestionsForProject`) — root + replies inline.
 *
 * Patroon volgt `emails-rls.test.ts`: echte `auth.admin.createUser` +
 * `signInWithPassword` zodat RLS daadwerkelijk evalueert in de klant-rol.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { describeWithDb } from "./helpers/describe-with-db";
import { getTestClient } from "./helpers/test-client";
import { sendQuestion, replyToQuestion } from "../src/mutations/client-questions";
import { listOpenQuestionsForProject } from "../src/queries/client-questions";

const PR022_IDS = {
  orgA: "00000000-0000-4022-8000-0000000000aa",
  orgB: "00000000-0000-4022-8000-0000000000bb",
  projectA: "00000000-0000-4022-8000-000000000001",
  projectB: "00000000-0000-4022-8000-000000000002",
} as const;

const PASSWORD = "pr022-test-password-secure";

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
    user_metadata: { full_name: `PR022 ${role}` },
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

describeWithDb("client_questions — mutations + RLS + query", () => {
  let svc: ReturnType<typeof getTestClient>;

  let teamMember: { id: string; email: string };
  let clientA: { id: string; email: string };
  let clientB: { id: string; email: string };

  let teamClient: SupabaseClient;
  let clientAClient: SupabaseClient;
  let clientBClient: SupabaseClient;

  async function cleanupQuestions() {
    // Replies eerst (FK self-ref) — eigenlijk doet ON DELETE CASCADE dat al,
    // maar expliciete `IS NOT NULL`-delete is goedkoper dan cascading.
    await svc
      .from("client_questions")
      .delete()
      .in("project_id", [PR022_IDS.projectA, PR022_IDS.projectB]);
  }

  beforeAll(async () => {
    svc = getTestClient();

    // ── Stale data opruimen ──
    await cleanupQuestions();
    await svc
      .from("portal_project_access")
      .delete()
      .in("project_id", [PR022_IDS.projectA, PR022_IDS.projectB]);
    await svc.from("projects").delete().in("id", [PR022_IDS.projectA, PR022_IDS.projectB]);
    await svc.from("organizations").delete().in("id", [PR022_IDS.orgA, PR022_IDS.orgB]);

    // ── Orgs + projects ──
    const { error: orgErr } = await svc.from("organizations").insert([
      { id: PR022_IDS.orgA, name: "PR022 Org A", type: "client", status: "active" },
      { id: PR022_IDS.orgB, name: "PR022 Org B", type: "client", status: "active" },
    ]);
    if (orgErr) throw new Error(`org seed: ${orgErr.message}`);

    const { error: projErr } = await svc.from("projects").insert([
      {
        id: PR022_IDS.projectA,
        name: "PR022 Project A",
        status: "in_progress",
        organization_id: PR022_IDS.orgA,
      },
      {
        id: PR022_IDS.projectB,
        name: "PR022 Project B",
        status: "in_progress",
        organization_id: PR022_IDS.orgB,
      },
    ]);
    if (projErr) throw new Error(`project seed: ${projErr.message}`);

    // ── Users ──
    teamMember = await ensureUser(svc, "pr022-team@test.local", "member");
    clientA = await ensureUser(svc, "pr022-client-a@test.local", "client", PR022_IDS.orgA);
    clientB = await ensureUser(svc, "pr022-client-b@test.local", "client", PR022_IDS.orgB);

    // Beide clients krijgen portal-access op hun eigen project. ClientB krijgt
    // óók access op projectA — zo testen we expliciet dat org-isolatie de
    // `has_portal_access`-check overruled (anders zou clientB de orgA-vragen
    // van projectA kunnen lezen via portal-access alleen).
    const { error: accErr } = await svc.from("portal_project_access").insert([
      { profile_id: clientA.id, project_id: PR022_IDS.projectA },
      { profile_id: clientB.id, project_id: PR022_IDS.projectB },
      { profile_id: clientB.id, project_id: PR022_IDS.projectA },
    ]);
    if (accErr) throw new Error(`portal access seed: ${accErr.message}`);

    teamClient = await createUserClient(teamMember.email);
    clientAClient = await createUserClient(clientA.email);
    clientBClient = await createUserClient(clientB.email);
  }, 60_000);

  afterAll(async () => {
    await cleanupQuestions();
    await svc
      .from("portal_project_access")
      .delete()
      .in("project_id", [PR022_IDS.projectA, PR022_IDS.projectB]);
    await svc.from("projects").delete().in("id", [PR022_IDS.projectA, PR022_IDS.projectB]);
    await svc.from("organizations").delete().in("id", [PR022_IDS.orgA, PR022_IDS.orgB]);
    if (teamMember) await svc.auth.admin.deleteUser(teamMember.id).catch(() => {});
    if (clientA) await svc.auth.admin.deleteUser(clientA.id).catch(() => {});
    if (clientB) await svc.auth.admin.deleteUser(clientB.id).catch(() => {});
  }, 60_000);

  // ===========================================================================
  // Mutations
  // ===========================================================================

  describe("sendQuestion", () => {
    it("team kan een root-vraag aanmaken (status=open, parent_id=null)", async () => {
      const result = await sendQuestion(
        {
          project_id: PR022_IDS.projectA,
          organization_id: PR022_IDS.orgA,
          body: "Kunnen jullie de logo's aanleveren in SVG-formaat?",
        },
        teamMember.id,
        svc,
      );
      expect(result).toMatchObject({ success: true });
      if (!("data" in result)) throw new Error("expected success");
      expect(result.data.status).toBe("open");
      expect(result.data.parent_id).toBeNull();
      expect(result.data.sender_profile_id).toBe(teamMember.id);
      expect(result.data.responded_at).toBeNull();
    });

    it("rejecteert payload met topic_id én issue_id (Zod refine, vóór DB)", async () => {
      const result = await sendQuestion(
        {
          project_id: PR022_IDS.projectA,
          organization_id: PR022_IDS.orgA,
          body: "Vraag met conflicterende koppelingen",
          topic_id: "00000000-0000-0000-0000-0000000000aa",
          issue_id: "00000000-0000-0000-0000-0000000000bb",
        },
        teamMember.id,
        svc,
      );
      expect(result).toMatchObject({ error: expect.any(String) });
    });

    it("rejecteert te korte body (<10 chars)", async () => {
      const result = await sendQuestion(
        { project_id: PR022_IDS.projectA, organization_id: PR022_IDS.orgA, body: "kort" },
        teamMember.id,
        svc,
      );
      expect(result).toMatchObject({ error: expect.any(String) });
    });
  });

  describe("replyToQuestion", () => {
    async function seedRootQuestion(): Promise<string> {
      const { data, error } = await svc
        .from("client_questions")
        .insert({
          project_id: PR022_IDS.projectA,
          organization_id: PR022_IDS.orgA,
          sender_profile_id: teamMember.id,
          body: "Root question for reply tests — needs to be open",
        })
        .select("id")
        .single();
      if (error || !data) throw new Error(`seed root failed: ${error?.message}`);
      return data.id as string;
    }

    it("klant-reply zet parent.status op responded + vult responded_at", async () => {
      const parentId = await seedRootQuestion();

      const result = await replyToQuestion(
        { parent_id: parentId, body: "Ja hier zijn ze." },
        { profile_id: clientA.id, role: "client" },
        svc,
      );
      expect(result).toMatchObject({ success: true });
      if (!("data" in result)) throw new Error("expected success");
      expect(result.data.parent_id).toBe(parentId);
      expect(result.data.project_id).toBe(PR022_IDS.projectA);
      expect(result.data.organization_id).toBe(PR022_IDS.orgA);

      const { data: parent } = await svc
        .from("client_questions")
        .select("status, responded_at")
        .eq("id", parentId)
        .single();
      expect(parent?.status).toBe("responded");
      expect(parent?.responded_at).toBeTruthy();
    });

    it("PRODUCTION-PATH: klant-reply via cookie-authed client flipt status (regressie-guard)", async () => {
      // Regressie-guard: het bovenstaande happy-path geval draait via
      // `svc` (service-role) en bypasst RLS — dat verbergt de bug waar
      // de UPDATE onder de cookie-authed klant-client silent op 0 rows
      // valt door de "Client questions: update (admin/member only)"-policy.
      // Deze test reproduceert het echte productie-pad en faalt als de
      // status-flip ooit weer de meegegeven client gebruikt i.p.v.
      // expliciet de service-role.
      const parentId = await seedRootQuestion();

      const result = await replyToQuestion(
        { parent_id: parentId, body: "Reply via klant-cookie-client." },
        { profile_id: clientA.id, role: "client" },
        clientAClient,
      );
      expect(result).toMatchObject({ success: true });

      const { data: parent } = await svc
        .from("client_questions")
        .select("status, responded_at")
        .eq("id", parentId)
        .single();
      expect(parent?.status).toBe("responded");
      expect(parent?.responded_at).toBeTruthy();
    });

    it("team-reply laat parent.status op open staan", async () => {
      const parentId = await seedRootQuestion();
      const result = await replyToQuestion(
        { parent_id: parentId, body: "Zal ik wat extra context geven?" },
        { profile_id: teamMember.id, role: "team" },
        svc,
      );
      expect(result).toMatchObject({ success: true });

      const { data: parent } = await svc
        .from("client_questions")
        .select("status, responded_at")
        .eq("id", parentId)
        .single();
      expect(parent?.status).toBe("open");
      expect(parent?.responded_at).toBeNull();
    });

    it("tweede klant-reply overschrijft responded_at niet", async () => {
      const parentId = await seedRootQuestion();

      const first = await replyToQuestion(
        { parent_id: parentId, body: "Eerste antwoord." },
        { profile_id: clientA.id, role: "client" },
        svc,
      );
      expect(first).toMatchObject({ success: true });

      const { data: afterFirst } = await svc
        .from("client_questions")
        .select("responded_at")
        .eq("id", parentId)
        .single();
      const firstResponded = afterFirst?.responded_at;
      expect(firstResponded).toBeTruthy();

      // Even later — rond op seconde-niveau is dat zichtbaar in `now()`.
      await new Promise((r) => setTimeout(r, 50));

      const second = await replyToQuestion(
        { parent_id: parentId, body: "En nog een aanvulling." },
        { profile_id: clientA.id, role: "client" },
        svc,
      );
      expect(second).toMatchObject({ success: true });

      const { data: afterSecond } = await svc
        .from("client_questions")
        .select("responded_at")
        .eq("id", parentId)
        .single();
      expect(afterSecond?.responded_at).toBe(firstResponded);
    });

    it("rejecteert reply op een reply (single-level threading)", async () => {
      const parentId = await seedRootQuestion();
      const first = await replyToQuestion(
        { parent_id: parentId, body: "Klant-reply" },
        { profile_id: clientA.id, role: "client" },
        svc,
      );
      if (!("data" in first)) throw new Error("expected first reply success");

      const nested = await replyToQuestion(
        { parent_id: first.data.id, body: "Reply op reply" },
        { profile_id: teamMember.id, role: "team" },
        svc,
      );
      expect(nested).toMatchObject({
        error: expect.stringMatching(/single-level|reply to a reply/i),
      });
    });

    it("rejecteert reply op niet-bestaande parent", async () => {
      const result = await replyToQuestion(
        { parent_id: "00000000-0000-4022-8000-00000000ffff", body: "Hello?" },
        { profile_id: teamMember.id, role: "team" },
        svc,
      );
      expect(result).toMatchObject({ error: expect.stringMatching(/not found/i) });
    });
  });

  // ===========================================================================
  // DB-constraints
  // ===========================================================================

  describe("DB constraints", () => {
    it("XOR-CHECK: insert met topic_id én issue_id faalt", async () => {
      // We hebben geen seeded topic/issue voor deze projecten, maar de CHECK
      // is een PURE row-level check — FKs worden ná de CHECK geëvalueerd.
      // Met willekeurige UUIDs faalt de FK óf de CHECK; beide kanten
      // bevestigen dat de row wordt afgewezen.
      const { error } = await svc.from("client_questions").insert({
        project_id: PR022_IDS.projectA,
        organization_id: PR022_IDS.orgA,
        sender_profile_id: teamMember.id,
        body: "Beide koppelingen tegelijk hoort niet",
        topic_id: "00000000-0000-4022-9999-000000000001",
        issue_id: "00000000-0000-4022-9999-000000000002",
      });
      expect(error).not.toBeNull();
    });

    it("status-CHECK: insert met onbekende status faalt", async () => {
      const { error } = await svc.from("client_questions").insert({
        project_id: PR022_IDS.projectA,
        organization_id: PR022_IDS.orgA,
        sender_profile_id: teamMember.id,
        body: "Status moet open of responded zijn",
        status: "archived",
      });
      expect(error).not.toBeNull();
    });
  });

  // ===========================================================================
  // RLS
  // ===========================================================================

  describe("RLS — SELECT", () => {
    it("klant ziet alleen vragen op eigen project + eigen org", async () => {
      // Twee root-vragen seeden: één voor orgA op projectA, één voor orgB op projectB.
      const { data: rows, error } = await svc
        .from("client_questions")
        .insert([
          {
            project_id: PR022_IDS.projectA,
            organization_id: PR022_IDS.orgA,
            sender_profile_id: teamMember.id,
            body: "Vraag voor org A — zichtbaar voor clientA",
          },
          {
            project_id: PR022_IDS.projectB,
            organization_id: PR022_IDS.orgB,
            sender_profile_id: teamMember.id,
            body: "Vraag voor org B — zichtbaar voor clientB",
          },
        ])
        .select("id, organization_id");
      if (error) throw new Error(error.message);
      const orgAId = rows!.find((r) => r.organization_id === PR022_IDS.orgA)!.id;
      const orgBId = rows!.find((r) => r.organization_id === PR022_IDS.orgB)!.id;

      const { data: aSeen } = await clientAClient
        .from("client_questions")
        .select("id, organization_id")
        .in("id", [orgAId, orgBId]);
      const aIds = (aSeen ?? []).map((r) => r.id);
      expect(aIds).toContain(orgAId);
      expect(aIds).not.toContain(orgBId);

      const { data: bSeen } = await clientBClient
        .from("client_questions")
        .select("id, organization_id")
        .in("id", [orgAId, orgBId]);
      const bIds = (bSeen ?? []).map((r) => r.id);
      expect(bIds).toContain(orgBId);
      expect(bIds).not.toContain(orgAId);
    });

    it("clientB met portal-access op projectA ziet GEEN orgA-vragen (org-isolatie wint)", async () => {
      const { data: row, error } = await svc
        .from("client_questions")
        .insert({
          project_id: PR022_IDS.projectA,
          organization_id: PR022_IDS.orgA,
          sender_profile_id: teamMember.id,
          body: "Org A vraag op project A — clientB heeft portal-access maar andere org",
        })
        .select("id")
        .single();
      if (error || !row) throw new Error(error?.message);

      const { data: seen } = await clientBClient
        .from("client_questions")
        .select("id")
        .eq("id", row.id);
      expect(seen ?? []).toEqual([]);
    });

    it("team-member ziet alle vragen ongeacht org", async () => {
      const { data: row, error } = await svc
        .from("client_questions")
        .insert({
          project_id: PR022_IDS.projectB,
          organization_id: PR022_IDS.orgB,
          sender_profile_id: teamMember.id,
          body: "Team ziet alles",
        })
        .select("id")
        .single();
      if (error || !row) throw new Error(error?.message);

      const { data: seen } = await teamClient
        .from("client_questions")
        .select("id")
        .eq("id", row.id);
      expect((seen ?? []).map((r) => r.id)).toContain(row.id);
    });
  });

  describe("RLS — INSERT", () => {
    it("CC-006: klant met portal-access + matching org KAN root-INSERT (parent_id NULL)", async () => {
      // CC-006 vervangt PR-RULE-030 voor de root-tak. Klant mag nu een vrije
      // thread starten op een project waar zij portal-access op heeft, mits
      // de organization matcht. clientA: orgA + access op projectA → toegestaan.
      const { data, error } = await clientAClient
        .from("client_questions")
        .insert({
          project_id: PR022_IDS.projectA,
          organization_id: PR022_IDS.orgA,
          sender_profile_id: clientA.id,
          body: "Klant start een vrij bericht aan team — CC-006",
        })
        .select();
      expect(error).toBeNull();
      expect((data ?? []).length).toBe(1);
    });

    it("CC-006: klant kan GEEN root-INSERT op project van andere org (multi-tenant guard)", async () => {
      // clientA = orgA. portal-access seed gaf clientA alleen access op projectA.
      // Probeer een root in projectB (org B) — RLS moet blokkeren.
      const { data, error } = await clientAClient
        .from("client_questions")
        .insert({
          project_id: PR022_IDS.projectB,
          organization_id: PR022_IDS.orgB,
          sender_profile_id: clientA.id,
          body: "Cross-org root attempt — moet falen",
        })
        .select();
      const inserted = error === null ? (data ?? []).length : 0;
      expect(inserted).toBe(0);
    });

    it("CC-006: klant met portal-access maar mismatching org wordt geblokkeerd op root", async () => {
      // clientB = orgB, maar heeft portal-access op projectA (orgA). Een root
      // in projectA met organization_id=orgA moet alsnog falen omdat
      // clientB's profile.organization_id ≠ orgA.
      const { data, error } = await clientBClient
        .from("client_questions")
        .insert({
          project_id: PR022_IDS.projectA,
          organization_id: PR022_IDS.orgA,
          sender_profile_id: clientB.id,
          body: "Org-mismatch root attempt — moet falen",
        })
        .select();
      const inserted = error === null ? (data ?? []).length : 0;
      expect(inserted).toBe(0);
    });

    it("klant KAN reply-INSERT doen op zichtbare parent", async () => {
      const { data: parent, error: parentErr } = await svc
        .from("client_questions")
        .insert({
          project_id: PR022_IDS.projectA,
          organization_id: PR022_IDS.orgA,
          sender_profile_id: teamMember.id,
          body: "Parent-vraag voor klant-reply RLS-test",
        })
        .select("id")
        .single();
      if (parentErr || !parent) throw new Error(parentErr?.message);

      const { data: reply, error } = await clientAClient
        .from("client_questions")
        .insert({
          project_id: PR022_IDS.projectA,
          organization_id: PR022_IDS.orgA,
          sender_profile_id: clientA.id,
          parent_id: parent.id,
          body: "Klant-reply",
        })
        .select("id, parent_id")
        .single();
      expect(error).toBeNull();
      expect(reply?.parent_id).toBe(parent.id);
    });

    it("klant kan GEEN reply-INSERT doen op andere-org parent", async () => {
      const { data: parent, error: parentErr } = await svc
        .from("client_questions")
        .insert({
          project_id: PR022_IDS.projectB,
          organization_id: PR022_IDS.orgB,
          sender_profile_id: teamMember.id,
          body: "Parent-vraag in org B",
        })
        .select("id")
        .single();
      if (parentErr || !parent) throw new Error(parentErr?.message);

      const { data, error } = await clientAClient
        .from("client_questions")
        .insert({
          project_id: PR022_IDS.projectB,
          organization_id: PR022_IDS.orgB,
          sender_profile_id: clientA.id,
          parent_id: parent.id,
          body: "Cross-org reply attempt",
        })
        .select();
      const inserted = error === null ? (data ?? []).length : 0;
      expect(inserted).toBe(0);
    });
  });

  describe("RLS — UPDATE", () => {
    it("klant kan GEEN status of body wijzigen", async () => {
      const { data: row, error: insErr } = await svc
        .from("client_questions")
        .insert({
          project_id: PR022_IDS.projectA,
          organization_id: PR022_IDS.orgA,
          sender_profile_id: teamMember.id,
          body: "Update-doelwit",
        })
        .select("id")
        .single();
      if (insErr || !row) throw new Error(insErr?.message);

      const { data: updated, error } = await clientAClient
        .from("client_questions")
        .update({ body: "hacked" })
        .eq("id", row.id)
        .select();
      const changed = error === null ? (updated ?? []).length : 0;
      expect(changed).toBe(0);

      const { data: post } = await svc
        .from("client_questions")
        .select("body")
        .eq("id", row.id)
        .single();
      expect(post?.body).toBe("Update-doelwit");
    });
  });

  // ===========================================================================
  // Query
  // ===========================================================================

  describe("listOpenQuestionsForProject", () => {
    it("returnt alleen open root-vragen + replies inline, replies tijdsgesorteerd", async () => {
      // Schoon vooraf zodat ordering-asserts deterministisch zijn.
      await cleanupQuestions();

      const { data: open1, error: e1 } = await svc
        .from("client_questions")
        .insert({
          project_id: PR022_IDS.projectA,
          organization_id: PR022_IDS.orgA,
          sender_profile_id: teamMember.id,
          body: "Open vraag #1",
        })
        .select("id")
        .single();
      if (e1 || !open1) throw new Error(e1?.message);

      const { data: open2, error: e2 } = await svc
        .from("client_questions")
        .insert({
          project_id: PR022_IDS.projectA,
          organization_id: PR022_IDS.orgA,
          sender_profile_id: teamMember.id,
          body: "Open vraag #2",
        })
        .select("id")
        .single();
      if (e2 || !open2) throw new Error(e2?.message);

      // Eén vraag handmatig op `responded` zetten — die mag NIET in resultaten.
      const { data: responded, error: e3 } = await svc
        .from("client_questions")
        .insert({
          project_id: PR022_IDS.projectA,
          organization_id: PR022_IDS.orgA,
          sender_profile_id: teamMember.id,
          body: "Al beantwoord",
          status: "responded",
          responded_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (e3 || !responded) throw new Error(e3?.message);

      // Twee replies op open1, met een tijdsverschil zodat sortering meetbaar is.
      const t1 = new Date(Date.now() - 2000).toISOString();
      const t2 = new Date(Date.now() - 1000).toISOString();
      const { error: re } = await svc.from("client_questions").insert([
        {
          project_id: PR022_IDS.projectA,
          organization_id: PR022_IDS.orgA,
          sender_profile_id: clientA.id,
          parent_id: open1.id,
          body: "Reply A (eerst)",
          created_at: t1,
        },
        {
          project_id: PR022_IDS.projectA,
          organization_id: PR022_IDS.orgA,
          sender_profile_id: clientA.id,
          parent_id: open1.id,
          body: "Reply B (later)",
          created_at: t2,
        },
      ]);
      if (re) throw new Error(re.message);

      const rows = await listOpenQuestionsForProject(PR022_IDS.projectA, PR022_IDS.orgA, svc);

      const ids = rows.map((r) => r.id);
      expect(ids).toContain(open1.id);
      expect(ids).toContain(open2.id);
      expect(ids).not.toContain(responded.id);

      const open1Row = rows.find((r) => r.id === open1.id)!;
      expect(open1Row.replies).toHaveLength(2);
      expect(open1Row.replies[0].body).toBe("Reply A (eerst)");
      expect(open1Row.replies[1].body).toBe("Reply B (later)");
    });

    it("filtert op organisatie — andere-org-vragen niet zichtbaar", async () => {
      await cleanupQuestions();

      const { error: e } = await svc.from("client_questions").insert([
        {
          project_id: PR022_IDS.projectA,
          organization_id: PR022_IDS.orgA,
          sender_profile_id: teamMember.id,
          body: "Org A vraag",
        },
        {
          project_id: PR022_IDS.projectB,
          organization_id: PR022_IDS.orgB,
          sender_profile_id: teamMember.id,
          body: "Org B vraag",
        },
      ]);
      if (e) throw new Error(e.message);

      const orgARows = await listOpenQuestionsForProject(PR022_IDS.projectA, PR022_IDS.orgA, svc);
      expect(orgARows.every((r) => r.body.includes("Org A"))).toBe(true);
      expect(orgARows.length).toBeGreaterThan(0);
    });
  });
});
