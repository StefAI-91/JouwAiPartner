"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Building2, Users, ChevronRight, X } from "lucide-react";
import { Badge } from "@repo/ui/badge";
import { formatMeetingType } from "@/lib/constants/meeting";
import { groupMeetingsByDate } from "@/lib/grouping";
import type { VerifiedMeetingListItem } from "@repo/database/queries/meetings";

interface MeetingsListProps {
  meetings: VerifiedMeetingListItem[];
}

export function MeetingsList({ meetings }: MeetingsListProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);

  const meetingTypes = useMemo(
    () => [...new Set(meetings.map((m) => m.meeting_type).filter(Boolean))] as string[],
    [meetings],
  );

  const people = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of meetings) {
      for (const p of m.participants) {
        map.set(p.id, p.name);
      }
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [meetings]);

  const filtered = useMemo(() => {
    let result = meetings;
    if (selectedType) {
      result = result.filter((m) => m.meeting_type === selectedType);
    }
    if (selectedPerson) {
      result = result.filter((m) => m.participants.some((p) => p.id === selectedPerson));
    }
    return result;
  }, [meetings, selectedType, selectedPerson]);

  const groups = useMemo(() => groupMeetingsByDate(filtered), [filtered]);
  const hasFilters = selectedType !== null || selectedPerson !== null;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={selectedType ?? ""}
          onChange={(e) => setSelectedType(e.target.value || null)}
          className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground"
        >
          <option value="">Alle types</option>
          {meetingTypes.map((type) => (
            <option key={type} value={type}>
              {formatMeetingType(type)}
            </option>
          ))}
        </select>

        <select
          value={selectedPerson ?? ""}
          onChange={(e) => setSelectedPerson(e.target.value || null)}
          className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground"
        >
          <option value="">Alle deelnemers</option>
          {people.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>

        {hasFilters && (
          <button
            onClick={() => {
              setSelectedType(null);
              setSelectedPerson(null);
            }}
            className="flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
            Wis filters
          </button>
        )}

        {hasFilters && (
          <span className="text-xs text-muted-foreground">
            {filtered.length} van {meetings.length}
          </span>
        )}
      </div>

      {/* Grouped list */}
      {groups.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Geen meetings gevonden met deze filters.
        </p>
      ) : (
        groups.map((group) => (
          <div key={group.date}>
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.label}
            </h2>
            <div className="divide-y divide-border/40">
              {group.meetings.map((meeting) => (
                <Link
                  key={meeting.id}
                  href={`/meetings/${meeting.id}`}
                  className="group flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-snug">
                      {meeting.title ?? "Untitled"}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                      {meeting.organization && (
                        <span className="flex items-center gap-0.5">
                          <Building2 className="h-3 w-3" />
                          {meeting.organization.name}
                        </span>
                      )}
                      {meeting.participants.length > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Users className="h-3 w-3" />
                          {meeting.participants.length}
                        </span>
                      )}
                      {meeting.meeting_type && (
                        <Badge variant="outline" className="h-4 text-[10px]">
                          {formatMeetingType(meeting.meeting_type)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
