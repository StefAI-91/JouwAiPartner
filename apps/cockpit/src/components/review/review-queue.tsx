"use client";

import { useState } from "react";
import { Mail, Video } from "lucide-react";
import { ReviewCard } from "./review-card";
import { EmailReviewCard } from "@/features/emails/components/email-review-card";

type Filter = "meetings" | "emails";

interface ReviewQueueProps {
  meetings: React.ComponentProps<typeof ReviewCard>["meeting"][];
  emails: React.ComponentProps<typeof EmailReviewCard>["email"][];
}

export function ReviewQueue({ meetings, emails }: ReviewQueueProps) {
  const [filter, setFilter] = useState<Filter>("meetings");

  const items = filter === "meetings" ? meetings : emails;
  const count = items.length;

  return (
    <>
      {/* Toggle */}
      <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1 w-fit">
        <button
          onClick={() => setFilter("meetings")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
            filter === "meetings"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Video className="h-3.5 w-3.5" />
          Meetings
          <span
            className={`ml-0.5 rounded-full px-1.5 py-0.5 text-xs ${
              filter === "meetings"
                ? "bg-brand/10 text-brand"
                : "bg-slate-200 text-muted-foreground"
            }`}
          >
            {meetings.length}
          </span>
        </button>
        <button
          onClick={() => setFilter("emails")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
            filter === "emails"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Mail className="h-3.5 w-3.5" />
          Emails
          <span
            className={`ml-0.5 rounded-full px-1.5 py-0.5 text-xs ${
              filter === "emails" ? "bg-brand/10 text-brand" : "bg-slate-200 text-muted-foreground"
            }`}
          >
            {emails.length}
          </span>
        </button>
      </div>

      {/* Items grid */}
      {count === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center text-sm text-muted-foreground">
          No {filter === "meetings" ? "meetings" : "emails"} awaiting review
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filter === "meetings" &&
            meetings.map((meeting) => <ReviewCard key={meeting.id} meeting={meeting} />)}
          {filter === "emails" &&
            emails.map((email) => <EmailReviewCard key={email.id} email={email} />)}
        </div>
      )}
    </>
  );
}
