import { z } from "zod";
import { zUuid } from "./uuid";

const email = z.string().trim().toLowerCase().email("Ongeldig e-mailadres");
const role = z.enum(["admin", "member"]);

/**
 * Invite a new user. Admins cannot receive `projectIds` — they have implicit
 * access to everything (RULE-161). We enforce this via `.superRefine` so the
 * validation error surfaces in the form instead of silently dropping input.
 */
export const inviteUserSchema = z
  .object({
    email,
    role,
    projectIds: z.array(zUuid).default([]),
    resendInvite: z.boolean().default(false),
  })
  .superRefine((val, ctx) => {
    if (val.role === "admin" && val.projectIds.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["projectIds"],
        message: "Admins hebben impliciet toegang tot alle projecten — laat projectIds leeg.",
      });
    }
  });

export type InviteUserInput = z.input<typeof inviteUserSchema>;

/**
 * Update access for an existing user. At least one of `role` or `projectIds`
 * must be set (a no-op update indicates a caller bug).
 */
export const updateUserAccessSchema = z
  .object({
    userId: zUuid,
    role: role.optional(),
    projectIds: z.array(zUuid).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.role === undefined && val.projectIds === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["role"],
        message: "Geef een rol of projectIds op.",
      });
    }
    if (val.role === "admin" && val.projectIds && val.projectIds.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["projectIds"],
        message: "Admins hebben impliciet toegang tot alle projecten — laat projectIds leeg.",
      });
    }
  });

export type UpdateUserAccessInput = z.input<typeof updateUserAccessSchema>;

export const deactivateUserSchema = z.object({ userId: zUuid });
export type DeactivateUserInput = z.input<typeof deactivateUserSchema>;
