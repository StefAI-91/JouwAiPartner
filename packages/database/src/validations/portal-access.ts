import { z } from "zod";
import { zUuid } from "./uuid";

/**
 * Invite a client user with access to one specific project. Trigger-point is
 * the cockpit project-detail page (Klanten-sectie). Anders dan
 * `inviteUserSchema` (in `team.ts`) dwingt dit schema role='client' af — er is
 * geen role-veld. Een member of admin invite je via /admin/team.
 */
export const inviteProjectClientSchema = z.object({
  email: z.string().trim().toLowerCase().email("Ongeldig e-mailadres"),
  projectId: zUuid,
});

export type InviteProjectClientInput = z.input<typeof inviteProjectClientSchema>;

/**
 * Revoke a client's portal access to one specific project. Verwijdert alleen
 * de access-rij — laat het profiel staan (voor attributie van eventuele
 * historische comments/feedback) en raakt geen andere projecten waar de
 * client wél toegang toe houdt.
 */
export const revokeProjectClientSchema = z.object({
  profileId: zUuid,
  projectId: zUuid,
});

export type RevokeProjectClientInput = z.input<typeof revokeProjectClientSchema>;
