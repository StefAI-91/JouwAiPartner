export const ORG_TYPES = ["client", "partner", "supplier", "advisor", "internal", "other"] as const;
export type OrgType = (typeof ORG_TYPES)[number];

export const ORG_STATUSES = ["prospect", "active", "inactive"] as const;
export type OrgStatus = (typeof ORG_STATUSES)[number];
