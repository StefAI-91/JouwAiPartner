export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createClient } from "@repo/database/supabase/server";
import { getDraftMeetingById } from "@repo/database/queries/review";
import { ReviewDetail } from "@/components/review/review-detail";

export default async function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const meeting = await getDraftMeetingById(id, supabase);

  if (!meeting) notFound();

  return <ReviewDetail meeting={meeting} />;
}
