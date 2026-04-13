"use server";

import { redirect } from "next/navigation";
import { createClient } from "@repo/database/supabase/server";
import { isAuthBypassed } from "./helpers";

/**
 * Signs the current user out of Supabase and clears the session cookies,
 * then redirects to `/login`.
 *
 * In dev bypass mode there is no real session to clear, so we still redirect
 * to `/login` as a visible no-op.
 *
 * Shared between cockpit and devhub — both apps transpile `@repo/auth`.
 */
export async function signOutAction() {
  if (!isAuthBypassed()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
