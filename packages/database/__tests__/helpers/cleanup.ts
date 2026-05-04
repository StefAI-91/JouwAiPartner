import { getTestClient } from "./test-client";
import { TEST_IDS } from "./seed";

/**
 * Remove all test data in the correct order (respecting foreign keys).
 * Uses the deterministic TEST_IDS to only remove test data, not production/seed data.
 */
export async function cleanupTestData() {
  const supabase = getTestClient();

  // Delete in reverse dependency order
  await supabase.from("tasks").delete().eq("id", TEST_IDS.task);
  await supabase.from("tasks").delete().eq("id", TEST_IDS.task2);
  await supabase.from("extractions").delete().eq("id", TEST_IDS.extraction);
  await supabase.from("extractions").delete().eq("id", TEST_IDS.extraction2);
  await supabase.from("extractions").delete().eq("meeting_id", TEST_IDS.meeting);
  await supabase.from("extractions").delete().eq("meeting_id", TEST_IDS.meeting2);
  await supabase.from("meeting_projects").delete().eq("meeting_id", TEST_IDS.meeting);
  await supabase.from("meeting_projects").delete().eq("meeting_id", TEST_IDS.meeting2);
  await supabase.from("meetings").delete().eq("id", TEST_IDS.meeting);
  await supabase.from("meetings").delete().eq("id", TEST_IDS.meeting2);
  await supabase.from("issue_activity").delete().eq("issue_id", TEST_IDS.issue);
  await supabase.from("issue_comments").delete().eq("issue_id", TEST_IDS.issue);
  // PR-002: topic_issues hangt aan issues + topics; eerst leegmaken op alle
  // gebruikte test-id's, daarna pas de issues/topics zelf droppen.
  await supabase
    .from("topic_issues")
    .delete()
    .in("issue_id", [TEST_IDS.issue, TEST_IDS.issue2, TEST_IDS.issue3]);
  await supabase.from("topics").delete().in("id", [TEST_IDS.topic, TEST_IDS.topic2]);
  // CP-012: sprints hebben FK vanuit topics (target_sprint_id, ON DELETE
  // SET NULL). Topics zijn nu al weg, dus sprints mag direct.
  await supabase.from("sprints").delete().in("id", [TEST_IDS.sprint, TEST_IDS.sprint2]);
  await supabase
    .from("issues")
    .delete()
    .in("id", [TEST_IDS.issue, TEST_IDS.issue2, TEST_IDS.issue3]);
  await supabase.from("email_extractions").delete().eq("email_id", TEST_IDS.email);
  await supabase.from("email_projects").delete().eq("email_id", TEST_IDS.email);
  await supabase.from("emails").delete().eq("id", TEST_IDS.email);
  await supabase.from("projects").delete().eq("id", TEST_IDS.project);
  await supabase.from("projects").delete().eq("id", TEST_IDS.project2);
  await supabase.from("people").delete().eq("id", TEST_IDS.person);
  await supabase.from("organizations").delete().eq("id", TEST_IDS.organization);
}

/**
 * Broader cleanup: delete all rows matching any of the deterministic test IDs.
 * Useful when tests create additional records with custom IDs.
 */
export async function cleanupAllTestData(additionalIds: string[] = []) {
  const supabase = getTestClient();
  const allIds: string[] = [...Object.values(TEST_IDS), ...additionalIds];

  // Junction + dependent tables first
  await supabase.from("tasks").delete().in("id", allIds);
  await supabase.from("email_extractions").delete().in("email_id", allIds);
  await supabase.from("email_projects").delete().in("email_id", allIds);
  await supabase.from("issue_activity").delete().in("issue_id", allIds);
  await supabase.from("issue_comments").delete().in("issue_id", allIds);
  await supabase.from("topic_issues").delete().in("issue_id", allIds);
  await supabase.from("topic_issues").delete().in("topic_id", allIds);
  await supabase.from("topics").delete().in("id", allIds);
  await supabase.from("extractions").delete().in("id", allIds);
  await supabase.from("extractions").delete().in("meeting_id", allIds);
  await supabase.from("meeting_projects").delete().in("meeting_id", allIds);

  // Main tables
  await supabase.from("meetings").delete().in("id", allIds);
  await supabase.from("issues").delete().in("id", allIds);
  await supabase.from("emails").delete().in("id", allIds);
  await supabase.from("google_accounts").delete().in("id", allIds);
  await supabase.from("projects").delete().in("id", allIds);
  await supabase.from("people").delete().in("id", allIds);
  await supabase.from("organizations").delete().in("id", allIds);
}

/**
 * Delete test auth users (and cascade-delete their profiles).
 */
export async function cleanupTestProfile(profileId?: string) {
  const supabase = getTestClient();
  if (profileId) {
    await supabase.auth.admin.deleteUser(profileId);
  }
}

/**
 * Delete meetings by a filter (useful for tests that create meetings with dynamic IDs).
 */
export async function cleanupMeetingsByFirefliesPrefix(prefix: string) {
  const supabase = getTestClient();
  await supabase.from("meetings").delete().like("fireflies_id", `${prefix}%`);
}
