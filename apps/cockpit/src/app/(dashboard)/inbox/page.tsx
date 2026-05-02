export const dynamic = "force-dynamic";

import { InboxPage } from "@/features/inbox/components/inbox-page";
import type { InboxFilter } from "@/features/inbox/components/inbox-header";

export const metadata = {
  title: "Inbox · Cockpit",
};

const VALID_FILTERS: InboxFilter[] = ["wacht_op_mij", "wacht_op_klant", "geparkeerd"];

export default async function InboxRoute({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const params = await searchParams;
  const filter = (VALID_FILTERS as string[]).includes(params.filter ?? "")
    ? (params.filter as InboxFilter)
    : "wacht_op_mij";
  return <InboxPage filter={filter} />;
}
