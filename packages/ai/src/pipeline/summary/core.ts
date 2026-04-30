/**
 * Shared types + pure helpers voor project- en org-summary pipelines.
 * Bevat geen DB-calls of AI-calls; alleen data-mapping zodat project.ts
 * en org.ts identieke input-shapes naar de summarizer-agents sturen.
 */

export interface FormattedMeetingForSummary {
  title: string | null;
  date: string | null;
  meetingType: string | null;
  briefing: string | null;
  summary: string | null;
}

export interface FormattedEmailForSummary {
  subject: string | null;
  date: string;
  from: string;
  snippet: string | null;
}

interface MeetingRow {
  title: string | null;
  date: string | null;
  meeting_type: string | null;
  ai_briefing: string | null;
  summary: string | null;
}

interface EmailRow {
  subject: string | null;
  date: string;
  from_name: string | null;
  from_address: string;
  snippet: string | null;
}

export function formatMeetingForSummary(m: MeetingRow): FormattedMeetingForSummary {
  return {
    title: m.title,
    date: m.date,
    meetingType: m.meeting_type,
    briefing: m.ai_briefing,
    summary: m.summary,
  };
}

export function formatEmailForSummary(e: EmailRow): FormattedEmailForSummary {
  return {
    subject: e.subject,
    date: e.date,
    from: e.from_name ?? e.from_address,
    snippet: e.snippet,
  };
}

/**
 * Wrap output.timeline in een structured_content payload als er een timeline
 * is. Project- en org-summaries delen dit patroon — timeline hoort bij de
 * briefing-versie, niet bij context.
 */
export function buildTimelineStructuredContent<T>(timeline: T[]): { timeline: T[] } | null {
  return timeline.length > 0 ? { timeline } : null;
}
