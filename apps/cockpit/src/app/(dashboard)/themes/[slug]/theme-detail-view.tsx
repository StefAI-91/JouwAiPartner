"use client";

import { useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ThemeRow } from "@repo/database/queries/themes";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/ui/tabs";
import { ThemeHeader } from "@/components/themes/theme-header";
import { ThemeEditForm } from "@/components/themes/theme-edit-form";

const VALID_TABS = ["overview", "meetings", "decisions", "questions", "people"] as const;
type TabValue = (typeof VALID_TABS)[number];

export interface ThemeDetailViewProps {
  theme: ThemeRow;
  mentions30d: number;
  lastMentionedAt: string | null;
  canEdit: boolean;
  overview: ReactNode;
  meetings: ReactNode;
  decisions: ReactNode;
  questions: ReactNode;
  people: ReactNode;
}

/**
 * Client wrapper voor de theme detail page. Orchestreert:
 *  - view / edit mode toggle (alleen wanneer canEdit)
 *  - URL-synced tabs via `?tab=<value>` zodat refresh + deeplink werken
 *    (UI-270, "tab-switch geen useState")
 *
 * Tab-content wordt als `ReactNode` ingestuurd zodat de server page de
 * data-fetches kan doen — we knippen zo de boundary tussen server-data
 * en client-interactie netjes door.
 */
export function ThemeDetailView({
  theme,
  mentions30d,
  lastMentionedAt,
  canEdit,
  overview,
  meetings,
  decisions,
  questions,
  people,
}: ThemeDetailViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isEditing, setIsEditing] = useState(false);

  const tabFromUrl = searchParams.get("tab");
  const activeTab: TabValue = VALID_TABS.includes(tabFromUrl as TabValue)
    ? (tabFromUrl as TabValue)
    : "overview";

  function handleTabChange(next: unknown) {
    const value = String(next);
    const params = new URLSearchParams(searchParams.toString());
    if (value === "overview") {
      params.delete("tab");
    } else {
      params.set("tab", value);
    }
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }

  const isVerified = theme.status === "verified";
  const showEditToggle = canEdit && isVerified;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10 lg:px-10">
      <ThemeHeader
        theme={theme}
        mentions30d={mentions30d}
        lastMentionedAt={lastMentionedAt}
        canEdit={showEditToggle && !isEditing}
        onEditClick={() => setIsEditing(true)}
      />

      {isEditing && showEditToggle ? (
        <ThemeEditForm
          theme={theme}
          onDone={() => {
            setIsEditing(false);
            router.refresh();
          }}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="overview">Overzicht</TabsTrigger>
            <TabsTrigger value="meetings">Meetings</TabsTrigger>
            <TabsTrigger value="decisions">Besluiten</TabsTrigger>
            <TabsTrigger value="questions">Open vragen</TabsTrigger>
            <TabsTrigger value="people">Mensen</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">{overview}</TabsContent>
          <TabsContent value="meetings">{meetings}</TabsContent>
          <TabsContent value="decisions">{decisions}</TabsContent>
          <TabsContent value="questions">{questions}</TabsContent>
          <TabsContent value="people">{people}</TabsContent>
        </Tabs>
      )}
    </div>
  );
}
