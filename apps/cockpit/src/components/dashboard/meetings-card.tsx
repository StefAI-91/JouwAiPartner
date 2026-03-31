import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import type { RecentMeeting } from "@repo/database/queries/meetings";

function meetingHref(meeting: RecentMeeting): string {
  if (meeting.verification_status === "verified") return `/meetings/${meeting.id}`;
  if (meeting.verification_status === "draft") return `/review/${meeting.id}`;
  return "#";
}

interface MeetingsCardProps {
  meetings: RecentMeeting[];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function relevancePercent(score: number | null): string {
  if (score == null) return "";
  return Math.round(score * 100) + "%";
}

function relevanceBadgeVariant(score: number | null): "default" | "secondary" | "outline" {
  if (score == null) return "outline";
  if (score >= 0.8) return "default";
  if (score >= 0.6) return "secondary";
  return "outline";
}

export function MeetingsCard({ meetings }: MeetingsCardProps) {
  return (
    <Card>
      <CardHeader className="border-b border-border/50">
        <CardTitle>Recente meetings</CardTitle>
        <CardDescription>Verwerkte Fireflies transcripts</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        {meetings.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nog geen meetings verwerkt.
          </p>
        ) : (
          <ul className="divide-y divide-border/50">
            {meetings.map((meeting) => (
              <li key={meeting.id}>
                <Link
                  href={meetingHref(meeting)}
                  className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 rounded-lg -mx-2 px-2 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium leading-snug">{meeting.title ?? "Naamloos"}</p>
                    <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                      {meeting.verification_status === "verified" && (
                        <Badge variant="default" className="h-4 text-[10px] bg-green-600">
                          verified
                        </Badge>
                      )}
                      {meeting.verification_status === "draft" && (
                        <Badge variant="secondary" className="h-4 text-[10px]">
                          draft
                        </Badge>
                      )}
                      {meeting.relevance_score != null && (
                        <Badge
                          variant={relevanceBadgeVariant(meeting.relevance_score)}
                          className="h-4 text-[10px]"
                        >
                          {relevancePercent(meeting.relevance_score)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    {meeting.date && (
                      <span className="text-xs text-muted-foreground">
                        {formatDate(meeting.date)}
                      </span>
                    )}
                    {meeting.participants && meeting.participants.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {meeting.participants.length}
                      </span>
                    )}
                    {meeting.meeting_type && (
                      <Badge variant="outline" className="h-4 text-[10px]">
                        {meeting.meeting_type}
                      </Badge>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
