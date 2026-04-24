/**
 * Backfill `meeting_type = 'board'` voor bestaande meetings waarvan alle
 * deelnemers admin zijn (sprint 035 / AI-013).
 *
 * Loopt alle meetings af, classificeert deelnemers via de bestaande
 * `classifyParticipantsWithCache` + admin-flag, en update meetings die voldoen
 * aan de board-regel: alle classified participants `label = 'internal'` én
 * `is_admin = true`. Geen extracties of pipeline-stappen worden opnieuw
 * gedraaid — alleen het type wordt aangepast.
 *
 * Idempotent: meetings met `meeting_type = 'board'` worden overgeslagen.
 *
 * Usage:
 *   npx tsx packages/ai/src/scripts/reclassify-board-meetings.ts
 *   npx tsx packages/ai/src/scripts/reclassify-board-meetings.ts --dry-run
 */

import { getAdminClient } from "@repo/database/supabase/admin";
import { getAllKnownPeople } from "@repo/database/queries/people";
import { classifyParticipantsWithCache, isBoardMeeting } from "../pipeline/participant/classifier";

interface MeetingRow {
  id: string;
  title: string | null;
  date: string | null;
  meeting_type: string | null;
  participants: string[] | null;
  raw_fireflies: Record<string, unknown> | null;
}

interface Stats {
  scanned: number;
  candidates: number;
  updated: number;
  skipped: number;
  errors: number;
}

function log(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.info(`[${ts}] ${msg}`);
}

/**
 * Extract attendee emails from `raw_fireflies.meeting_attendees` indien
 * aanwezig — biedt betrouwbaarder data dan de losse `participants` array.
 */
function extractAttendeeEmails(raw: Record<string, unknown> | null): string[] {
  if (!raw) return [];
  const attendees = raw.meeting_attendees;
  if (!Array.isArray(attendees)) return [];

  const emails: string[] = [];
  for (const a of attendees) {
    if (a && typeof a === "object" && "email" in a) {
      const email = (a as { email?: unknown }).email;
      if (typeof email === "string" && email.includes("@")) {
        emails.push(email.toLowerCase().trim());
      }
    }
  }
  return emails;
}

function mergeParticipants(participants: string[] | null, attendeeEmails: string[]): string[] {
  const base = participants ?? [];
  const seen = new Set(base.map((p) => p.toLowerCase().trim()));
  const merged = [...base];
  for (const email of attendeeEmails) {
    if (!seen.has(email)) {
      merged.push(email);
      seen.add(email);
    }
  }
  return merged;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const stats: Stats = {
    scanned: 0,
    candidates: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
  };

  log(`Start reclassify-board-meetings (dry-run=${dryRun})`);

  const db = getAdminClient();
  const knownPeople = await getAllKnownPeople();
  const adminCount = knownPeople.filter((p) => p.is_admin).length;
  log(`Known people: ${knownPeople.length} (admins: ${adminCount})`);

  if (adminCount === 0) {
    log(
      "⚠ Geen admin-people gevonden — verwacht hadden dat Stef en Wouter via profiles.role='admin' gekoppeld waren aan een people-row met dezelfde e-mail. Stoppen.",
    );
    return;
  }

  const { data, error } = await db
    .from("meetings")
    .select("id, title, date, meeting_type, participants, raw_fireflies")
    .order("date", { ascending: false });

  if (error || !data) {
    log(`✗ Kan meetings niet ophalen: ${error?.message ?? "no data"}`);
    process.exitCode = 1;
    return;
  }

  for (const row of data as MeetingRow[]) {
    stats.scanned++;

    if (row.meeting_type === "board") {
      stats.skipped++;
      continue;
    }

    const attendeeEmails = extractAttendeeEmails(row.raw_fireflies);
    const merged = mergeParticipants(row.participants, attendeeEmails);
    if (merged.length === 0) continue;

    const classified = classifyParticipantsWithCache(merged, knownPeople);
    if (!isBoardMeeting(classified)) continue;

    stats.candidates++;
    const old = row.meeting_type ?? "(none)";
    log(
      `→ ${row.id} | ${row.date?.slice(0, 10) ?? "?"} | ${row.title ?? "(geen titel)"}: ${old} → board`,
    );

    if (dryRun) continue;

    const { error: updateError } = await db
      .from("meetings")
      .update({ meeting_type: "board" })
      .eq("id", row.id);

    if (updateError) {
      stats.errors++;
      log(`  ✗ update faalde: ${updateError.message}`);
    } else {
      stats.updated++;
    }
  }

  log("─".repeat(60));
  log(`Scanned:    ${stats.scanned}`);
  log(`Candidates: ${stats.candidates}`);
  log(`Updated:    ${stats.updated}${dryRun ? " (dry-run, geen UPDATE uitgevoerd)" : ""}`);
  log(`Skipped:    ${stats.skipped} (al meeting_type='board')`);
  log(`Errors:     ${stats.errors}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
