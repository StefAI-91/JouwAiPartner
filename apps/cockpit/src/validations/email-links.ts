import { z } from "zod";
import { zUuid } from "./uuid";

export const emailProjectSchema = z.object({
  emailId: zUuid,
  projectId: zUuid,
});

export const emailOrganizationSchema = z.object({
  emailId: zUuid,
  organizationId: zUuid.nullable(),
});
