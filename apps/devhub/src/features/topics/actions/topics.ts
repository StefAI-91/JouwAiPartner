"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@repo/auth/helpers";
import { assertProjectAccess, NotAuthorizedError } from "@repo/auth/access";
import {
  insertTopic,
  updateTopic as dbUpdateTopic,
  deleteTopic as dbDeleteTopic,
  updateTopicStatus as dbUpdateTopicStatus,
} from "@repo/database/mutations/topics";
import { getTopicById } from "@repo/database/queries/topics";
import {
  createTopicSchema,
  deleteTopicSchema,
  updateTopicStatusActionSchema,
  updateTopicWithIdSchema,
} from "../validations/topic";

type ActionResult<T = undefined> = T extends undefined
  ? { success: true } | { error: string }
  : { success: true; data: T } | { error: string };

/**
 * Helper — vertaalt access-failures naar een neutrale "niet gevonden"-error
 * zodat een client niet uit de error-tekst kan afleiden welke topics
 * bestaan. Zelfde patroon als `updateIssueAction` in features/issues.
 */
async function ensureProjectAccess(
  userId: string,
  projectId: string,
): Promise<{ ok: true } | { error: string }> {
  try {
    await assertProjectAccess(userId, projectId);
    return { ok: true };
  } catch (e) {
    if (e instanceof NotAuthorizedError) return { error: "Topic niet gevonden" };
    throw e;
  }
}

export async function createTopicAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  const parsed = createTopicSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };

  const access = await ensureProjectAccess(user.id, parsed.data.project_id);
  if ("error" in access) return access;

  const result = await insertTopic({ ...parsed.data, created_by: user.id });
  if ("error" in result) return { error: "Topic aanmaken mislukt" };

  revalidatePath("/topics");
  return { success: true, data: { id: result.data.id } };
}

export async function updateTopicAction(input: unknown): Promise<ActionResult> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  const parsed = updateTopicWithIdSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };

  const { id, ...data } = parsed.data;
  const current = await getTopicById(id);
  if (!current) return { error: "Topic niet gevonden" };

  const access = await ensureProjectAccess(user.id, current.project_id);
  if ("error" in access) return access;

  const result = await dbUpdateTopic(id, data);
  if ("error" in result) return { error: "Topic bijwerken mislukt" };

  revalidatePath("/topics");
  revalidatePath(`/topics/${id}`);
  return { success: true };
}

export async function updateTopicStatusAction(input: unknown): Promise<ActionResult> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  const parsed = updateTopicStatusActionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };

  const { id, status, wont_do_reason, status_overridden } = parsed.data;
  const current = await getTopicById(id);
  if (!current) return { error: "Topic niet gevonden" };

  const access = await ensureProjectAccess(user.id, current.project_id);
  if ("error" in access) return access;

  const result = await dbUpdateTopicStatus(id, status, {
    wont_do_reason: wont_do_reason ?? undefined,
    status_overridden,
  });
  if ("error" in result) return { error: "Status bijwerken mislukt" };

  revalidatePath("/topics");
  revalidatePath(`/topics/${id}`);
  return { success: true };
}

export async function deleteTopicAction(input: unknown): Promise<ActionResult> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };

  const parsed = deleteTopicSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };

  const current = await getTopicById(parsed.data.id);
  if (!current) return { error: "Topic niet gevonden" };

  const access = await ensureProjectAccess(user.id, current.project_id);
  if ("error" in access) return access;

  const result = await dbDeleteTopic(parsed.data.id);
  if ("error" in result) {
    // Bewust niet doorgeven van interne mutation-errors, maar wél de
    // `gekoppeld`-melding behouden — die is UX-relevant.
    return {
      error: result.error.includes("gekoppeld") ? result.error : "Topic verwijderen mislukt",
    };
  }

  revalidatePath("/topics");
  return { success: true };
}
