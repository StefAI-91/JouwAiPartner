/**
 * Backfill organization_id for existing emails without a linked organisation.
 *
 * Draait drie-staps matching voor elke ongekoppelde e-mail, maar slaat
 * strategie 1 (classifier) over — die zou een volledige LLM-call per mail
 * vragen, te duur voor een bulk-backfill. We gebruiken alleen:
 *   - Strategie 2: sender-person → person.organization_id
 *   - Strategie 3: from_address domein → organizations.email_domains
 *
 * Usage:
 *   npx tsx packages/ai/src/scripts/backfill-email-organizations.ts
 *   npx tsx packages/ai/src/scripts/backfill-email-organizations.ts --dry-run
 *   npx tsx packages/ai/src/scripts/backfill-email-organizations.ts --limit 500
 *
 * Idempotent en resumable: selecteert altijd `WHERE organization_id IS NULL`,
 * dus eventuele herstart pikt vanzelf op waar de vorige run stopte. Sprint 034.
 */

import { getAdminClient } from "@repo/database/supabase/admin";
import { findPersonOrgByEmail } from "@repo/database/queries/people";
import { findOrganizationIdByEmailDomain } from "@repo/database/queries/organizations";

const BATCH_SIZE = 100;

function log(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.info(`[${ts}] ${msg}`);
}

interface BackfillStats {
  scanned: number;
  matchedByPerson: number;
  matchedByDomain: number;
  stillUnmatched: number;
  errors: number;
}

async function processBatch(
  emails: Array<{ id: string; from_address: string }>,
  dryRun: boolean,
  stats: BackfillStats,
): Promise<void> {
  const db = getAdminClient();

  for (const email of emails) {
    stats.scanned++;

    try {
      let orgId: string | null = null;
      let personId: string | null = null;
      let source: "person" | "domain" | null = null;

      // Strategie 2 — sender-person → organization_id
      const senderMatch = await findPersonOrgByEmail(email.from_address).catch(() => null);
      if (senderMatch) {
        personId = senderMatch.personId;
        if (senderMatch.organizationId) {
          orgId = senderMatch.organizationId;
          source = "person";
        }
      }

      // Strategie 3 — domein-fallback
      if (orgId === null) {
        const atIdx = email.from_address.lastIndexOf("@");
        if (atIdx > 0 && atIdx < email.from_address.length - 1) {
          const domain = email.from_address
            .slice(atIdx + 1)
            .trim()
            .toLowerCase();
          if (domain) {
            const matched = await findOrganizationIdByEmailDomain(domain).catch(() => null);
            if (matched) {
              orgId = matched;
              source = "domain";
            }
          }
        }
      }

      if (orgId === null) {
        stats.stillUnmatched++;
        continue;
      }

      if (source === "person") stats.matchedByPerson++;
      if (source === "domain") stats.matchedByDomain++;

      if (!dryRun) {
        const update: Record<string, unknown> = {
          organization_id: orgId,
          updated_at: new Date().toISOString(),
        };
        if (personId) update.sender_person_id = personId;

        const { error } = await db.from("emails").update(update).eq("id", email.id);
        if (error) {
          log(`  ! update failed for email ${email.id}: ${error.message}`);
          stats.errors++;
        }
      }
    } catch (err) {
      stats.errors++;
      log(`  ! error on email ${email.id}: ${err}`);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const limitIdx = args.indexOf("--limit");
  const limitRaw = limitIdx !== -1 && args[limitIdx + 1] ? parseInt(args[limitIdx + 1], 10) : NaN;
  const hardLimit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : Number.POSITIVE_INFINITY;

  log(
    `Starting backfill — ${dryRun ? "DRY RUN" : "WRITE MODE"}${
      hardLimit !== Number.POSITIVE_INFINITY ? ` (limit ${hardLimit})` : ""
    }`,
  );

  const db = getAdminClient();
  const stats: BackfillStats = {
    scanned: 0,
    matchedByPerson: 0,
    matchedByDomain: 0,
    stillUnmatched: 0,
    errors: 0,
  };

  // Pagination strategie hangt af van mode:
  //  - WRITE: gekoppelde mails vallen uit de filter, dus we lezen altijd
  //    vanaf de top (offset blijft 0). Filter zelf zorgt voor progressie.
  //    Tracken: hoeveel rijen blijven onaangeroerd (still_unmatched) — als
  //    een batch alleen onaangeroerde rijen heeft, is het volgende batch
  //    identiek en moeten we stoppen.
  //  - DRY-RUN: niks wordt geüpdatet, dus offset MOET ophogen om door de
  //    set te lopen.
  let offset = 0;
  let prevUnmatchedCount = -1;
  while (stats.scanned < hardLimit) {
    const remaining = hardLimit - stats.scanned;
    const pageSize = Math.min(BATCH_SIZE, remaining);

    const { data, error } = await db
      .from("emails")
      .select("id, from_address")
      .is("organization_id", null)
      .order("date", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      log(`Query failed: ${error.message}`);
      break;
    }
    if (!data || data.length === 0) {
      log("No more unmatched emails — done.");
      break;
    }

    log(`Batch @ offset ${offset}: ${data.length} rows (total scanned so far ${stats.scanned})`);
    const unmatchedBefore = stats.stillUnmatched;
    await processBatch(data, dryRun, stats);
    const unmatchedDelta = stats.stillUnmatched - unmatchedBefore;

    if (data.length < pageSize) break;

    if (dryRun) {
      // Dry-run muteert niks → offset moet vooruit
      offset += data.length;
    } else {
      // Write-mode: gekoppelde rijen vallen uit de filter, ongekoppelde rijen
      // blijven boven aan de set staan. Offset alleen vooruit met het aantal
      // dat ongekoppeld blijft, anders slaan we rijen over.
      offset += unmatchedDelta;

      // Veiligheidsklep: als de batch volledig ongekoppeld blijft (alle rijen
      // matchen op niks) komt deze pagina elke iteratie weer terug. Stop dan.
      if (unmatchedDelta === data.length && unmatchedDelta === prevUnmatchedCount) {
        log("Batch fully unmatched and identical to previous — stopping to avoid loop.");
        break;
      }
      prevUnmatchedCount = unmatchedDelta;
    }
  }

  log("");
  log("Backfill finished.");
  log(`  Scanned:          ${stats.scanned}`);
  log(`  Matched (person): ${stats.matchedByPerson}`);
  log(`  Matched (domain): ${stats.matchedByDomain}`);
  log(`  Still unmatched:  ${stats.stillUnmatched}`);
  log(`  Errors:           ${stats.errors}`);
  log(dryRun ? "  Mode:             DRY RUN (no writes)" : "  Mode:             WRITE");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
