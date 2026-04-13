/**
 * CLI: nodig de eerste member uit voordat de admin-UI (DH-020) live is.
 *
 * Gebruik:
 *   npx tsx scripts/invite-user.ts --email ege@jouwaipartner.nl --role member --projects <uuid>,<uuid>
 *   npx tsx scripts/invite-user.ts --email someone@client.nl --role admin
 *
 * Vereist .env.local met NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY en
 * NEXT_PUBLIC_DEVHUB_URL.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

type Args = {
  email: string;
  role: "admin" | "member";
  projects: string[];
  resend: boolean;
};

function parseArgs(argv: string[]): Args {
  const out: Partial<Args> = { projects: [], resend: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--email") out.email = argv[++i];
    else if (arg === "--role") {
      const v = argv[++i];
      if (v !== "admin" && v !== "member") throw new Error(`--role moet 'admin' of 'member' zijn`);
      out.role = v;
    } else if (arg === "--projects") {
      out.projects = argv[++i]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (arg === "--resend") {
      out.resend = true;
    }
  }
  if (!out.email) throw new Error("--email is verplicht");
  if (!out.role) throw new Error("--role is verplicht");
  return out as Args;
}

async function main() {
  const { email, role, projects, resend } = parseArgs(process.argv.slice(2));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const devhubUrl = process.env.NEXT_PUBLIC_DEVHUB_URL;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY vereist");

  if (role === "admin" && projects.length > 0) {
    throw new Error("Admins hebben impliciet toegang — laat --projects leeg");
  }

  const admin = createClient(url, key);
  const normalizedEmail = email.trim().toLowerCase();
  const redirectTo = devhubUrl ? `${devhubUrl.replace(/\/$/, "")}/auth/callback` : undefined;

  // Check of al bestaand.
  const { data: list } = await admin.auth.admin.listUsers();
  const existing = list?.users?.find((u) => u.email?.toLowerCase() === normalizedEmail);

  let userId: string;
  if (existing && !resend) {
    console.log(`✓ User bestaat al (${existing.id}) — update rol + access zonder mail.`);
    userId = existing.id;
  } else {
    const { data: invite, error } = await admin.auth.admin.inviteUserByEmail(normalizedEmail, {
      redirectTo,
    });
    if (error || !invite?.user?.id) {
      console.error("✗ Invite mislukt:", error?.message);
      process.exit(1);
    }
    userId = invite.user.id;
    console.log(`✓ Invite verstuurd naar ${normalizedEmail} (${userId})`);
  }

  const { error: upErr } = await admin
    .from("profiles")
    .upsert({ id: userId, email: normalizedEmail, role }, { onConflict: "id" });
  if (upErr) {
    console.error("✗ Profile upsert mislukt:", upErr.message);
    process.exit(1);
  }
  console.log(`✓ Profile gezet op role=${role}`);

  await admin.from("devhub_project_access").delete().eq("profile_id", userId);

  if (role === "member" && projects.length > 0) {
    const rows = projects.map((pid) => ({ profile_id: userId, project_id: pid }));
    const { error } = await admin.from("devhub_project_access").insert(rows);
    if (error) {
      console.error("✗ Access insert mislukt:", error.message);
      process.exit(1);
    }
    console.log(`✓ ${projects.length} project-access rijen gezet`);
  }

  console.log("\nKlaar.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
