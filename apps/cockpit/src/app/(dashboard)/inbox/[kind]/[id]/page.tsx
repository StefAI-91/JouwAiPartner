export const dynamic = "force-dynamic";

import { ConversationPage } from "@/features/inbox/components/conversation-page";

export default async function ConversationRoute({
  params,
}: {
  params: Promise<{ kind: string; id: string }>;
}) {
  const { kind, id } = await params;
  return <ConversationPage kind={kind} id={id} />;
}
