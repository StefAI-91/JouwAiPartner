export const dynamic = "force-dynamic";

import { InboxPage } from "@/features/inbox/components/inbox-page";
import type { InboxFilter } from "@/features/inbox/components/inbox-header";

export const metadata = {
  title: "Inbox · Project · Cockpit",
};

const VALID_FILTERS: InboxFilter[] = ["wacht_op_mij", "wacht_op_klant", "geparkeerd"];

export default async function ProjectInboxRoute({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const filter = (VALID_FILTERS as string[]).includes(sp.filter ?? "")
    ? (sp.filter as InboxFilter)
    : "wacht_op_mij";
  return <InboxPage filter={filter} projectId={id} />;
}
