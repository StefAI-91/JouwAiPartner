import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { describeWithDb } from "../helpers/describe-with-db";
import { getTestClient } from "../helpers/test-client";
import {
  hasPortalProjectAccess,
  listPortalProjectAssignees,
  listPortalProjects,
} from "../../src/queries/portal/access";

/**
 * PR-024 — Integration tests voor de portal-access queries op het lager
 * niveau. Mock-grens: niets — we draaien tegen de Supabase test-instance via
 * service-role om RLS te bypassen (de queries worden in productie ook met
 * admin/page-client aangeroepen, niet vanuit de browser).
 *
 * Coverage:
 * - listPortalProjects: member met access-rij ziet alleen die projecten,
 *   member zonder rij ziet niks (SEC-221).
 * - hasPortalProjectAccess: member met rij = true, zonder rij = false (SEC-222).
 * - listPortalProjectAssignees: returnt clients én members met role-veld
 *   (SEC-223).
 */

const PR024_IDS = {
  org: "00000000-0000-4024-8000-0000000000aa",
  projectX: "00000000-0000-4024-8000-000000000001",
  projectY: "00000000-0000-4024-8000-000000000002",
} as const;

describeWithDb("queries/portal/access — PR-024 member access", () => {
  let svc: ReturnType<typeof getTestClient>;
  let admin: { id: string; email: string };
  let member: { id: string; email: string };
  let memberWithoutAccess: { id: string; email: string };
  let client: { id: string; email: string };

  async function ensureUser(
    email: string,
    role: "admin" | "member" | "client",
  ): Promise<{ id: string; email: string }> {
    // Probeer aan te maken; als bestaat → zoek op email.
    const { data: created, error: createErr } = await svc.auth.admin.createUser({
      email,
      password: "pr024-test-password-secure",
      email_confirm: true,
      user_metadata: { full_name: `PR024 ${role}` },
    });
    let id = created?.user?.id ?? null;
    if (!id || createErr) {
      const { data: list } = await svc.auth.admin.listUsers();
      id = list?.users?.find((u) => u.email === email)?.id ?? null;
    }
    if (!id) throw new Error(`failed to seed user ${email}`);

    const { error: roleErr } = await svc.from("profiles").update({ role }).eq("id", id);
    if (roleErr) throw new Error(`profile role update failed: ${roleErr.message}`);
    return { id, email };
  }

  beforeAll(async () => {
    svc = getTestClient();

    // ── Cleanup van vorige run ──
    await svc
      .from("portal_project_access")
      .delete()
      .in("project_id", [PR024_IDS.projectX, PR024_IDS.projectY]);
    await svc.from("projects").delete().in("id", [PR024_IDS.projectX, PR024_IDS.projectY]);
    await svc.from("organizations").delete().eq("id", PR024_IDS.org);

    // ── Org + projects ──
    const { error: orgErr } = await svc
      .from("organizations")
      .insert({ id: PR024_IDS.org, name: "PR024 Org", type: "client", status: "active" });
    if (orgErr) throw new Error(`org seed: ${orgErr.message}`);
    const { error: projErr } = await svc.from("projects").insert([
      {
        id: PR024_IDS.projectX,
        name: "PR024 Project X",
        status: "in_progress",
        organization_id: PR024_IDS.org,
      },
      {
        id: PR024_IDS.projectY,
        name: "PR024 Project Y",
        status: "in_progress",
        organization_id: PR024_IDS.org,
      },
    ]);
    if (projErr) throw new Error(`project seed: ${projErr.message}`);

    // ── Users — emails zijn deterministisch zodat re-runs idempotent zijn ──
    admin = await ensureUser("pr024-admin@test.local", "admin");
    member = await ensureUser("pr024-member@test.local", "member");
    memberWithoutAccess = await ensureUser("pr024-member-noaccess@test.local", "member");
    client = await ensureUser("pr024-client@test.local", "client");

    // Member EN client krijgen access op project X (niet Y).
    const { error: accErr } = await svc.from("portal_project_access").upsert(
      [
        { profile_id: member.id, project_id: PR024_IDS.projectX },
        { profile_id: client.id, project_id: PR024_IDS.projectX },
      ],
      { onConflict: "profile_id,project_id" },
    );
    if (accErr) throw new Error(`access seed: ${accErr.message}`);
  }, 60_000);

  afterAll(async () => {
    await svc
      .from("portal_project_access")
      .delete()
      .in("project_id", [PR024_IDS.projectX, PR024_IDS.projectY]);
    await svc.from("projects").delete().in("id", [PR024_IDS.projectX, PR024_IDS.projectY]);
    await svc.from("organizations").delete().eq("id", PR024_IDS.org);
    // Users laten staan — andere testfiles delen ze niet (unique emails).
    if (admin) await svc.auth.admin.deleteUser(admin.id).catch(() => {});
    if (member) await svc.auth.admin.deleteUser(member.id).catch(() => {});
    if (memberWithoutAccess)
      await svc.auth.admin.deleteUser(memberWithoutAccess.id).catch(() => {});
    if (client) await svc.auth.admin.deleteUser(client.id).catch(() => {});
  }, 60_000);

  describe("listPortalProjects", () => {
    it("SEC-221: member met access-rij ziet alleen project X", async () => {
      const projects = await listPortalProjects(member.id, svc);
      const ids = projects.map((p) => p.id);
      expect(ids).toContain(PR024_IDS.projectX);
      expect(ids).not.toContain(PR024_IDS.projectY);
    });

    it("SEC-221: member zonder access-rij ziet lege lijst (geen redirect)", async () => {
      const projects = await listPortalProjects(memberWithoutAccess.id, svc);
      const ids = projects.map((p) => p.id);
      expect(ids).not.toContain(PR024_IDS.projectX);
      expect(ids).not.toContain(PR024_IDS.projectY);
    });

    it("client met access-rij ziet alleen project X (regressie-check)", async () => {
      const projects = await listPortalProjects(client.id, svc);
      const ids = projects.map((p) => p.id);
      expect(ids).toContain(PR024_IDS.projectX);
      expect(ids).not.toContain(PR024_IDS.projectY);
    });

    it("admin ziet zowel project X als Y (preview-modus)", async () => {
      const projects = await listPortalProjects(admin.id, svc);
      const ids = projects.map((p) => p.id);
      expect(ids).toContain(PR024_IDS.projectX);
      expect(ids).toContain(PR024_IDS.projectY);
    });
  });

  describe("hasPortalProjectAccess", () => {
    it("SEC-222: member met rij voor X → true", async () => {
      expect(await hasPortalProjectAccess(member.id, PR024_IDS.projectX, svc)).toBe(true);
    });

    it("SEC-222: member zonder rij voor Y → false", async () => {
      expect(await hasPortalProjectAccess(member.id, PR024_IDS.projectY, svc)).toBe(false);
    });

    it("SEC-222: member zonder enige rij → false", async () => {
      expect(await hasPortalProjectAccess(memberWithoutAccess.id, PR024_IDS.projectX, svc)).toBe(
        false,
      );
    });

    it("admin → altijd true (preview-modus)", async () => {
      expect(await hasPortalProjectAccess(admin.id, PR024_IDS.projectY, svc)).toBe(true);
    });
  });

  describe("listPortalProjectAssignees", () => {
    it("SEC-223: returnt zowel client als member voor project X met role-veld", async () => {
      const assignees = await listPortalProjectAssignees(PR024_IDS.projectX, svc);
      const byId = new Map(assignees.map((a) => [a.profile_id, a]));

      expect(byId.get(client.id)?.role).toBe("client");
      expect(byId.get(member.id)?.role).toBe("member");
    });

    it("sorteert op email", async () => {
      const assignees = await listPortalProjectAssignees(PR024_IDS.projectX, svc);
      const emails = assignees
        .filter((a) => a.profile_id === client.id || a.profile_id === member.id)
        .map((a) => a.email);
      const sorted = [...emails].sort((a, b) => a.localeCompare(b));
      expect(emails).toEqual(sorted);
    });
  });
});
