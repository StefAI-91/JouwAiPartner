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
  // T02: additional IDs for mutation tests
  meeting2: "00000000-0000-0000-0000-000000000014",
  extraction2: "00000000-0000-0000-0000-000000000015",
  googleAccount: "00000000-0000-0000-0000-000000000007",
  email: "00000000-0000-0000-0000-000000000008",
  issue: "00000000-0000-0000-0000-000000000009",
  task2: "00000000-0000-0000-0000-000000000016",
  project2: "00000000-0000-0000-0000-000000000012",
  // PR-002: topics + extra issues for junction tests
  topic: "00000000-0000-0000-0000-000000000020",
  topic2: "00000000-0000-0000-0000-000000000021",
  issue2: "00000000-0000-0000-0000-000000000022",
  issue3: "00000000-0000-0000-0000-000000000023",
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
 * Seed a profile via auth.admin (profiles FK → auth.users).
 * Uses a deterministic email based on the ID to allow repeated calls.
 * Returns the profile row.
 */
export async function seedProfile(
  overrides: { id?: string; email?: string; full_name?: string } = {},
) {
  const supabase = getTestClient();
  const id = overrides.id ?? TEST_IDS.userId;
  const email = overrides.email ?? `test-${id}@test.local`;

  // Try to create auth user — ignore "already registered" errors
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: "test-password-T02-secure",
    email_confirm: true,
    user_metadata: { full_name: overrides.full_name ?? "Test User" },
  });

  if (authError && !authError.message.includes("already been registered")) {
    throw new Error(`seedProfile auth failed: ${authError.message}`);
  }

  const authUserId = authData?.user?.id;
  if (!authUserId) {
    // User already exists — look up by email
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u) => u.email === email);
    if (!existing) throw new Error(`seedProfile: user not found for ${email}`);
    return { id: existing.id, email };
  }

  return { id: authUserId, email };
}

export async function seedGoogleAccount(
  profileId: string,
  overrides: Record<string, unknown> = {},
) {
  const supabase = getTestClient();
  const data = {
    user_id: profileId,
    email: "test-google@test.local",
    access_token: "test-access-token",
    refresh_token: "test-refresh-token",
    token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
    scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
    ...overrides,
  };
  const { data: result, error } = await supabase
    .from("google_accounts")
    .upsert(data, { onConflict: "email" })
    .select()
    .single();
  if (error) throw new Error(`seedGoogleAccount failed: ${error.message}`);
  return result;
}

export async function seedEmail(googleAccountId: string, overrides: Record<string, unknown> = {}) {
  const supabase = getTestClient();
  const data = {
    id: TEST_IDS.email,
    google_account_id: googleAccountId,
    gmail_id: `test-gmail-${Date.now()}`,
    thread_id: "test-thread-1",
    subject: "Test Email Subject",
    from_address: "sender@test.local",
    from_name: "Test Sender",
    to_addresses: ["recipient@test.local"],
    cc_addresses: [],
    date: new Date().toISOString(),
    body_text: "Test email body",
    body_html: "<p>Test email body</p>",
    snippet: "Test email snippet",
    labels: ["INBOX"],
    has_attachments: false,
    raw_gmail: { id: "raw-test" },
    embedding_stale: true,
    verification_status: "draft",
    ...overrides,
  };
  const { data: result, error } = await supabase
    .from("emails")
    .upsert(data, { onConflict: "id" })
    .select()
    .single();
  if (error) throw new Error(`seedEmail failed: ${error.message}`);
  return result;
}

export async function seedIssue(overrides: Record<string, unknown> = {}) {
  const supabase = getTestClient();

  // Get next issue number via RPC
  const projectId = (overrides.project_id as string) ?? TEST_IDS.project;
  const { data: issueNumber, error: seqError } = await supabase.rpc("next_issue_number", {
    p_project_id: projectId,
  });
  if (seqError) throw new Error(`seedIssue seq failed: ${seqError.message}`);

  const data = {
    id: TEST_IDS.issue,
    project_id: projectId,
    title: "Test Issue",
    description: "Test issue description",
    type: "bug",
    status: "triage",
    priority: "p2",
    source: "manual",
    issue_number: issueNumber,
    ...overrides,
  };
  const { data: result, error } = await supabase
    .from("issues")
    .upsert(data, { onConflict: "id" })
    .select()
    .single();
  if (error) throw new Error(`seedIssue failed: ${error.message}`);
  return result;
}

/**
 * Seed a topic. Caller bepaalt zelf welke profile_id `created_by` is — die
 * is FK naar profiles, dus geef de id van een eerder geseede profile mee.
 */
export async function seedTopic(createdBy: string, overrides: Record<string, unknown> = {}) {
  const supabase = getTestClient();
  const data = {
    id: TEST_IDS.topic,
    project_id: TEST_IDS.project,
    title: "Test Topic",
    type: "bug",
    status: "clustering",
    created_by: createdBy,
    ...overrides,
  };
  const { data: result, error } = await supabase
    .from("topics")
    .upsert(data, { onConflict: "id" })
    .select()
    .single();
  if (error) throw new Error(`seedTopic failed: ${error.message}`);
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
