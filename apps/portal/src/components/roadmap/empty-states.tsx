import type { PortalBucketKey } from "@repo/database/constants/topics";

const COPY: Record<PortalBucketKey, string> = {
  recent_done: "Nog geen recent opgeleverde onderwerpen",
  upcoming: "Geen onderwerpen voor deze week",
  high_prio: "Geen geprioriteerde onderwerpen wachtend",
  awaiting_input: "Niets meer wachtend op jullie signaal",
};

export function EmptyState({ bucket }: { bucket: PortalBucketKey }) {
  return <p className="px-1 py-3 text-[13px] italic text-[var(--ink-muted)]">{COPY[bucket]}</p>;
}
