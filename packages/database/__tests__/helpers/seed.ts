import { getTestClient } from "./test-client";

// Deterministic UUIDs for test data — predictable and easy to reference
export const TEST_IDS = {
  organization: "00000000-0000-0000-0000-000000000001",
  project: "00000000-0000-0000-0000-000000000002",
  person: "00000000-0000-0000-0000-000000000003",
  meeting: "00000000-0000-0000-0000-000000000004",
  extraction: "00000000-0000-0000-0000-000000000005",
  task: "00000000-0000-0000-0000-000000000006",
  userId: "00000000-0000-0000-0000-000000000099",
} as const;

export async function seedOrganization(overrides: Record<string, unknown> = {}) {
  const supabase = getTestClient();
  const data = {
    id: TEST_IDS.organization,
    name: "Test Organization",
    type: "client",
    status: "active",
    ...overrides,
  };
  const { data: result, error } = await supabase
    .from("organizations")
    .upsert(data, { onConflict: "id" })
    .select()
    .single();
  if (error) throw new Error(`seedOrganization failed: ${error.message}`);
  return result;
}

export async function seedProject(overrides: Record<string, unknown> = {}) {
  const supabase = getTestClient();
  const data = {
    id: TEST_IDS.project,
    name: "Test Project",
    status: "in_progress",
    organization_id: TEST_IDS.organization,
    ...overrides,
  };
  const { data: result, error } = await supabase
    .from("projects")
    .upsert(data, { onConflict: "id" })
    .select()
    .single();
  if (error) throw new Error(`seedProject failed: ${error.message}`);
  return result;
}

export async function seedPerson(overrides: Record<string, unknown> = {}) {
  const supabase = getTestClient();
  const data = {
    id: TEST_IDS.person,
    name: "Test Person",
    email: "test@example.com",
    role: "Developer",
    ...overrides,
  };
  const { data: result, error } = await supabase
    .from("people")
    .upsert(data, { onConflict: "id" })
    .select()
    .single();
  if (error) throw new Error(`seedPerson failed: ${error.message}`);
  return result;
}

export async function seedMeeting(overrides: Record<string, unknown> = {}) {
  const supabase = getTestClient();
  const data = {
    id: TEST_IDS.meeting,
    title: "Test Meeting",
    date: new Date().toISOString(),
    meeting_type: "team_sync",
    party_type: "internal",
    verification_status: "draft",
    fireflies_id: `test-fireflies-${Date.now()}`,
    ...overrides,
  };
  const { data: result, error } = await supabase
    .from("meetings")
    .upsert(data, { onConflict: "id" })
    .select()
    .single();
  if (error) throw new Error(`seedMeeting failed: ${error.message}`);
  return result;
}

export async function seedExtraction(overrides: Record<string, unknown> = {}) {
  const supabase = getTestClient();
  const data = {
    id: TEST_IDS.extraction,
    meeting_id: TEST_IDS.meeting,
    type: "action_item",
    content: "Test extraction content",
    confidence: 0.9,
    verification_status: "draft",
    ...overrides,
  };
  const { data: result, error } = await supabase
    .from("extractions")
    .upsert(data, { onConflict: "id" })
    .select()
    .single();
  if (error) throw new Error(`seedExtraction failed: ${error.message}`);
  return result;
}

export async function seedTask(overrides: Record<string, unknown> = {}) {
  const supabase = getTestClient();
  const data = {
    id: TEST_IDS.task,
    extraction_id: TEST_IDS.extraction,
    title: "Test Task",
    status: "active",
    created_by: TEST_IDS.userId,
    ...overrides,
  };
  const { data: result, error } = await supabase
    .from("tasks")
    .upsert(data, { onConflict: "id" })
    .select()
    .single();
  if (error) throw new Error(`seedTask failed: ${error.message}`);
  return result;
}

/**
 * Seed a complete set of related test data.
 * Creates: organization -> project -> person -> meeting -> extraction -> task
 */
export async function seedAll() {
  const org = await seedOrganization();
  const project = await seedProject();
  const person = await seedPerson();
  const meeting = await seedMeeting({ organization_id: TEST_IDS.organization });
  const extraction = await seedExtraction();
  const task = await seedTask();
  return { org, project, person, meeting, extraction, task };
}
