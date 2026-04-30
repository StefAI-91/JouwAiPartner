"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@repo/auth/helpers";
import { isAdmin } from "@repo/auth/access";
import {
  addWidgetDomainSchema,
  removeWidgetDomainSchema,
  type AddWidgetDomainInput,
  type RemoveWidgetDomainInput,
} from "@repo/database/validations/widget-domain";
import { addWidgetDomain, removeWidgetDomain } from "@repo/database/mutations/widget";
import { recordAuditEvent } from "@repo/database/mutations/audit-events";

const SETTINGS_PATH = "/settings/widget";

/**
 * Voeg een whitelisted Origin toe voor een project. Alleen admins. Schrijft
 * een audit-rij zodat we later kunnen zien wie welk domein heeft toegevoegd
 * (relevant bij security-incidenten of klant-onboarding-vragen).
 */
export async function addWidgetDomainAction(
  input: AddWidgetDomainInput,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Alleen admins" };

  const parsed = addWidgetDomainSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  const result = await addWidgetDomain(parsed.data.projectId, parsed.data.domain);
  if ("error" in result) return { error: "Toevoegen mislukt" };

  await recordAuditEvent({
    event_type: "widget_domain_added",
    actor_id: user.id,
    target_id: parsed.data.projectId,
    metadata: { domain: parsed.data.domain },
  });

  revalidatePath(SETTINGS_PATH);
  return { success: true };
}

export async function removeWidgetDomainAction(
  input: RemoveWidgetDomainInput,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!(await isAdmin(user.id))) return { error: "Alleen admins" };

  const parsed = removeWidgetDomainSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  const normalized = parsed.data.domain.trim().toLowerCase();
  const result = await removeWidgetDomain(parsed.data.projectId, normalized);
  if ("error" in result) return { error: "Verwijderen mislukt" };

  await recordAuditEvent({
    event_type: "widget_domain_removed",
    actor_id: user.id,
    target_id: parsed.data.projectId,
    metadata: { domain: normalized },
  });

  revalidatePath(SETTINGS_PATH);
  return { success: true };
}
