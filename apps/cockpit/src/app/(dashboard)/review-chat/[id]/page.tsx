export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createClient } from "@repo/database/supabase/server";
import { getMeetingForReviewChat } from "@repo/database/queries/review";
import { ReviewChat } from "@/components/review-chat/review-chat";

export default async function ReviewChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const meeting = await getMeetingForReviewChat(id, supabase);
  if (!meeting) notFound();

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <ReviewChat meeting={meeting} />
    </div>
  );
}
