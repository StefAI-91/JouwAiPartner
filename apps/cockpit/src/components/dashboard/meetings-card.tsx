import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, CheckCircle2, Clock, ChevronRight } from "lucide-react";
import type { RecentMeeting } from "@repo/database/queries/meetings";
import { formatDateShort } from "@/lib/format";
import { getMeetingHref } from "@/lib/meeting-href";

interface MeetingsCardProps {
  meetings: RecentMeeting[];
}

function relevanceColor(score: number | null): string {
  if (score == null) return "text-muted-foreground/40 stroke-muted";
  if (score >= 0.8) return "text-[#006B3F] stroke-[#006B3F]";
  if (score >= 0.6) return "text-amber-500 stroke-amber-500";
  return "text-muted-foreground stroke-muted-foreground/40";
}

function RelevanceRing({ score }: { score: number | null }) {
  if (score == null) return null;
  const percent = Math.round(score * 100);
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - score * circumference;

  return (
    <div className={`relative flex items-center justify-center ${relevanceColor(score)}`}>
      <svg width="36" height="36" className="-rotate-90">
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          strokeWidth="2.5"
          className="stroke-muted/50"
        />
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-current transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <span className="absolute text-[9px] font-semibold tabular-nums">
        {percent}
      </span>
    </div>
  );
}

export function MeetingsCard({ meetings }: MeetingsCardProps) {
  return (
    <Card>
      <CardHeader className="border-b border-border/50">
        <CardTitle>Recente meetings</CardTitle>
        <CardDescription>Verwerkte Fireflies transcripts</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        {meetings.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nog geen meetings verwerkt.
          </p>
        ) : (
          <ul className="-mx-1">
            {meetings.map((meeting) => {
              const isVerified = meeting.verification_status === "verified";
              return (
                <li key={meeting.id}>
                  <Link
                    href={getMeetingHref(meeting.id, meeting.verification_status)}
                    className="group flex items-center gap-3 rounded-lg px-2.5 py-3 transition-all hover:bg-muted/60 active:scale-[0.995]"
                  >
                    {/* Relevance ring */}
                    <div className="shrink-0">
                      <RelevanceRing score={meeting.relevance_score} />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium leading-snug">
                          {meeting.title ?? "Naamloos"}
                        </p>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                        {meeting.date && (
                          <span>{formatDateShort(meeting.date)}</span>
                        )}
                        {meeting.participants && meeting.participants.length > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Users className="h-3 w-3" />
                            {meeting.participants.length}
                          </span>
                        )}
                        {meeting.meeting_type && (
                          <span className="rounded-md bg-muted px-1.5 py-px font-medium">
                            {meeting.meeting_type.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status + arrow */}
                    <div className="flex shrink-0 items-center gap-1.5">
                      {isVerified ? (
                        <CheckCircle2 className="h-4 w-4 text-[#006B3F]" />
                      ) : (
                        <Badge variant="secondary" className="h-5 gap-1 text-[10px] font-medium">
                          <Clock className="h-2.5 w-2.5" />
                          review
                        </Badge>
                      )}
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
