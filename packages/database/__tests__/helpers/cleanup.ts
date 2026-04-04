import { getTestClient } from "./test-client";
import { TEST_IDS } from "./seed";

/**
 * Remove all test data in the correct order (respecting foreign keys).
 * Deletes: tasks -> extractions -> meetings -> projects -> people -> organizations
 *
 * Uses the deterministic TEST_IDS to only remove test data, not production/seed data.
 */
export async function cleanupTestData() {
  const supabase = getTestClient();

  // Delete in reverse dependency order
  await supabase.from("tasks").delete().eq("id", TEST_IDS.task);
  await supabase.from("extractions").delete().eq("id", TEST_IDS.extraction);
  await supabase.from("meetings").delete().eq("id", TEST_IDS.meeting);
  await supabase.from("projects").delete().eq("id", TEST_IDS.project);
  await supabase.from("people").delete().eq("id", TEST_IDS.person);
  await supabase.from("organizations").delete().eq("id", TEST_IDS.organization);
}

/**
 * Broader cleanup: delete all rows matching any of the deterministic test IDs.
 * Useful when tests create additional records with custom IDs.
 */
export async function cleanupAllTestData(additionalIds: string[] = []) {
  const supabase = getTestClient();
  const allIds = [
    TEST_IDS.task,
    TEST_IDS.extraction,
    TEST_IDS.meeting,
    TEST_IDS.project,
    TEST_IDS.person,
    TEST_IDS.organization,
    ...additionalIds,
  ];

  await supabase.from("tasks").delete().in("id", allIds);
  await supabase.from("extractions").delete().in("id", allIds);
  await supabase.from("meetings").delete().in("id", allIds);
  await supabase.from("projects").delete().in("id", allIds);
  await supabase.from("people").delete().in("id", allIds);
  await supabase.from("organizations").delete().in("id", allIds);
}
