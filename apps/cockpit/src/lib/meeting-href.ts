export function getMeetingHref(id: string, verificationStatus: string | null): string {
  if (verificationStatus === "verified") return `/meetings/${id}`;
  if (verificationStatus === "draft") return `/review/${id}`;
  return "#";
}
