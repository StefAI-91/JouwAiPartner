import { PreviewSidebar } from "./_components/preview-sidebar";
import { PreviewHero, PreviewStatusBanner, PreviewTopBar } from "./_components/preview-header";
import { BriefingCard, ClosedThisWeekCard, SidePanelCards } from "./_components/preview-briefing";
import {
  InProgressCard,
  RoadmapSection,
  SlaCard,
  WaitingOnYouCard,
} from "./_components/preview-work";

/**
 * Portal dogfood/preview page — pure presentational, no DB calls.
 * Sections live in `_components/`, mock data in `_data/preview.ts`.
 */
export default function PreviewPage() {
  return (
    <div className="flex min-h-screen">
      <PreviewSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <PreviewTopBar />

        <main className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col gap-8 px-8 py-8 lg:px-12 lg:py-10">
          <PreviewHero />
          <PreviewStatusBanner />
          <BriefingCard />

          <div className="grid gap-6 lg:grid-cols-3">
            <ClosedThisWeekCard className="lg:col-span-2" />
            <SidePanelCards />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <InProgressCard className="lg:col-span-2" />
            <WaitingOnYouCard />
          </div>

          <RoadmapSection />
          <SlaCard />
        </main>
      </div>
    </div>
  );
}
