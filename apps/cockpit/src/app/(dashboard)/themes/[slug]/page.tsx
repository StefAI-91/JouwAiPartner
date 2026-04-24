import { notFound } from "next/navigation";
import {
  getThemeBySlug,
  getThemeRecentActivity,
  getThemeMeetings,
  getThemeDecisions,
  getThemeParticipants,
  getThemeNarrative,
} from "@repo/database/queries/themes";
import { getAuthenticatedUser } from "@repo/auth/helpers";
import { isAdmin } from "@repo/auth/access";
import { ThemeDetailView } from "./theme-detail-view";
import { OverviewTab } from "./tabs/overview-tab";
import { MeetingsTab } from "./tabs/meetings-tab";
import { DecisionsTab } from "./tabs/decisions-tab";
import { QuestionsTab } from "./tabs/questions-tab";
import { PeopleTab } from "./tabs/people-tab";
import { NarrativeTab } from "./tabs/narrative-tab";

export const dynamic = "force-dynamic";

/**
 * TH-005 / TH-014 — Theme detail page met header + 6 tabs (Verhaal = default)
 * + edit-mode voor admins. Alle data wordt server-side geladen in parallel;
 * het client-deel (tabs + edit-toggle) zit in `ThemeDetailView`.
 */
export default async function ThemeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const theme = await getThemeBySlug(slug);
  if (!theme) notFound();

  const [activity, meetings, decisions, participants, narrative, user] = await Promise.all([
    getThemeRecentActivity(theme.id),
    getThemeMeetings(theme.id),
    getThemeDecisions(theme.id),
    getThemeParticipants(theme.id),
    getThemeNarrative(theme.id),
    getAuthenticatedUser(),
  ]);

  const canEdit = user?.id ? await isAdmin(user.id) : false;

  return (
    <ThemeDetailView
      theme={theme}
      mentions30d={activity.mentions}
      lastMentionedAt={activity.lastMentionedAt}
      canEdit={canEdit}
      narrative={<NarrativeTab theme={theme} narrative={narrative} canEdit={canEdit} />}
      overview={
        <OverviewTab
          meetingsCount={meetings.length}
          decisionsCount={decisions.length}
          openQuestionsCount={0}
          recentMeetings={meetings}
          recentDecisions={decisions}
        />
      }
      meetings={
        <MeetingsTab
          themeId={theme.id}
          themeName={theme.name}
          meetings={meetings}
          canRejectMatches={canEdit}
        />
      }
      decisions={<DecisionsTab decisions={decisions} />}
      questions={<QuestionsTab />}
      people={<PeopleTab participants={participants} />}
    />
  );
}
