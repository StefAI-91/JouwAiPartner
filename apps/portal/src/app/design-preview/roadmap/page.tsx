import type { Metadata } from "next";
import { PreviewShell } from "@/components/roadmap-preview/preview-shell";
import { SectionHeader } from "@/components/roadmap-preview/section-header";
import { RoadmapBoard } from "@/components/roadmap-preview/roadmap-board";
import { TopicDetail } from "@/components/roadmap-preview/topic-detail";
import { SignalCard } from "@/components/roadmap-preview/signal-buttons";
import { TopicCard } from "@/components/roadmap-preview/topic-card";
import { RejectedPanel } from "@/components/roadmap-preview/rejected-panel";
import { AuditTimeline } from "@/components/roadmap-preview/audit-timeline";
import { ReportsList } from "@/components/roadmap-preview/reports-list";
import { ReportDetail } from "@/components/roadmap-preview/report-detail";
import { getTopicById, SECTIONS } from "@/components/roadmap-preview/mock-data";

export const metadata: Metadata = {
  title: "Portal Roadmap — Design Preview",
  description: "Visualisatie van alle Portal-views uit prd-portal-roadmap.",
};

export default function RoadmapPreviewPage() {
  // Pick anchor topics for individual views.
  const detailTopic = getTopicById("t-005")!; // Publicatie-flow eindstap
  const signalDefault = getTopicById("t-013")!; // Statistieken-pagina (no signal)
  const signalActive = getTopicById("t-011")!; // Donkere modus (we'll set must-have)
  const signalDismiss = getTopicById("t-014")!; // Mailchimp (we'll preset 👎)
  const elsewhereTopic = getTopicById("t-008")!; // Drag-and-drop

  // Mock linked issues for topic-detail
  const detailLinkedIssues = [
    {
      id: "i-301",
      title: "Publish-endpoint schrijft soms zonder bevestiging",
      date: "16 apr",
      status: "done" as const,
    },
    {
      id: "i-302",
      title: "Cache-invalidate na publish loopt achter",
      date: "16 apr",
      status: "open" as const,
    },
    {
      id: "i-303",
      title: "Witte schermen op /studio/[slug] (intermittent)",
      date: "11 apr",
      status: "done" as const,
    },
    {
      id: "i-304",
      title: "Logo-upload bij publish faalt zonder feedback",
      date: "9 apr",
      status: "open" as const,
    },
    {
      id: "i-305",
      title: "Fallback-route ontbreekt bij publish-fail",
      date: "5 apr",
      status: "open" as const,
    },
  ];

  // Find sections by id for header data
  const section = (id: string) => SECTIONS.find((s) => s.id === id)!;

  return (
    <PreviewShell>
      {/* Intro */}
      <section id="intro" className="scroll-mt-24">
        <p className="section-marker mb-4">{section("intro").marker}</p>
        <h1 className="font-display text-[3rem] leading-[0.95] tracking-[-0.025em] text-[var(--ink)] md:text-[4.6rem]">
          Een vertrouwens-laag,
          <br />
          <em className="not-italic font-display italic text-[var(--ink-soft)]">geen dashboard.</em>
        </h1>
        <p className="mt-8 max-w-[58ch] text-[17px] leading-[1.7] text-[var(--ink-soft)]">
          Dit is een visuele voorstudie van de Portal-roadmap zoals beschreven in{" "}
          <span className="font-mono text-[14.5px] tracking-tight">prd-portal-roadmap</span>. Acht
          views, vijf fases, één samenhangende toon. Geen DB-verbinding, geen interactie die
          persisteert — wel de echte typografie, kleurkeuzes en compositie. Bedoeld om kritisch te
          bekijken vóór de eerste sprint.
        </p>

        <div
          className="mt-12 grid grid-cols-1 gap-px border overflow-hidden rounded-md md:grid-cols-3"
          style={{
            borderColor: "var(--rule-hairline)",
            backgroundColor: "var(--rule-hairline)",
          }}
        >
          {[
            {
              label: "Typografie",
              value: "Newsreader + Geist",
              detail: "Editorial serif + neutrale grotesk",
            },
            {
              label: "Tone",
              value: "Documentair",
              detail: "Rust, transparantie, redactioneel",
            },
            {
              label: "Brand-accent",
              value: "#006B3F",
              detail: "Spaarzaam — niet als foundation",
            },
          ].map((item) => (
            <div key={item.label} className="bg-[var(--paper-elevated)] px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
                {item.label}
              </p>
              <p className="mt-1 font-display text-[1.05rem] tracking-tight text-[var(--ink)]">
                {item.value}
              </p>
              <p className="mt-0.5 text-[12px] text-[var(--ink-muted)]">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* § 01 — Roadmap-overzicht */}
      <section>
        <SectionHeader
          id="roadmap"
          marker={section("roadmap").marker}
          title="Roadmap-overzicht"
          fase={section("roadmap").fase}
          description="De primaire view voor de klant. Vier buckets in één leesbare blik. Topic-niveau, niet issue-niveau — een topic kan vijf onderliggende meldingen samenvatten. Linker- en rechter-buckets gebruiken subtiele papier-tinten zodat de hiërarchie zonder schreeuwerige kleur leesbaar is."
        />

        <div className="space-y-12">
          <div>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-muted)]">
              Desktop · 4-koloms grid
            </p>
            <RoadmapBoard variant="desktop" />
          </div>

          <div>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-muted)]">
              Mobiel · gestapeld
            </p>
            <RoadmapBoard variant="mobile" />
          </div>
        </div>
      </section>

      {/* § 02 — Topic-detail */}
      <section>
        <SectionHeader
          id="topic-detail"
          marker={section("topic-detail").marker}
          title="Topic-detail"
          fase={section("topic-detail").fase}
          description="Read-only weergave van één topic. Status-pill bovenin, klantbeschrijving in lees-typografie, gekoppelde meldingen onderaan in een zachte lijst. In fase 1 nog géén knoppen — eerst meten of dit overzicht werkt."
        />

        <TopicDetail topic={detailTopic} linkedIssues={detailLinkedIssues} />
      </section>

      {/* § 03 — Klant-signalen */}
      <section>
        <SectionHeader
          id="signals"
          marker={section("signals").marker}
          title="Klant-signalen"
          fase={section("signals").fase}
          description="Drie staten naast elkaar: zonder signaal · actief 'must-have' · na een 👎 met undo-toast. De expliciete tooltip onderaan zet verwachtingen — een 🔥 betekent 'meeweegt', niet 'morgen klaar'."
        />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-muted)]">
              Default · geen signaal gegeven
            </p>
            <SignalCard topic={signalDefault} />
          </div>
          <div>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-muted)]">
              Actief · must-have
            </p>
            <SignalCard topic={signalActive} initialSignal="must_have" showAgeHint />
          </div>
          <div>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-muted)]">
              Na 👎 · undo-staat
            </p>
            <SignalCard topic={signalDismiss} initialSignal="not_relevant" />
          </div>
        </div>
      </section>

      {/* § 04 — Signaal blijft zichtbaar */}
      <section>
        <SectionHeader
          id="signal-elsewhere"
          marker={section("signal-elsewhere").marker}
          title="Signaal blijft zichtbaar"
          fase={section("signal-elsewhere").fase}
          description="Wanneer een topic met klant-signaal naar een andere bucket schuift, blijft het signaal als badge zichtbaar — read-only. Zo verdwijnt 'jouw stem' niet zodra het team het oppakt."
        />

        <div
          className="rounded-lg border p-6"
          style={{
            borderColor: "var(--rule-hairline)",
            backgroundColor: "var(--bucket-priority-bg)",
          }}
        >
          <header
            className="pb-4 mb-5 flex items-baseline justify-between"
            style={{ borderBottom: "1px solid var(--bucket-priority-rule)" }}
          >
            <h4
              className="font-display text-[1.15rem] tracking-tight"
              style={{ color: "var(--bucket-priority-ink)" }}
            >
              Bucket — Hoge prio daarna
            </h4>
            <span
              className="font-mono num-tabular text-[12px] tabular-nums"
              style={{ color: "var(--bucket-priority-ink)", opacity: 0.7 }}
            >
              03
            </span>
          </header>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <TopicCard topic={elsewhereTopic} showSignalBadge showSprint={false} />
          </div>
          <p className="mt-5 max-w-[60ch] text-[13px] leading-relaxed text-[var(--ink-muted)]">
            <span className="font-mono uppercase tracking-[0.12em] text-[10px] mr-2">
              Toelichting
            </span>
            Dit topic stond eerder in &laquo;Niet geprioritiseerd&raquo; en kreeg een 🔥-signaal. Nu
            het team het heeft opgepakt en geprioriteerd, blijft de badge meereizen — geen knoppen
            meer, alleen een leesbaar spoor van wat de klant aangaf.
          </p>
        </div>
      </section>

      {/* § 05 — Bekijk afgewezen wensen */}
      <section>
        <SectionHeader
          id="rejected"
          marker={section("rejected").marker}
          title="Bekijk afgewezen wensen"
          fase={section("rejected").fase}
          description="Topics die niet doorgaan krijgen een uitgeschreven reden. Geen wens verdwijnt zonder uitleg — dat sluit het zwart gat dat klanten in v1 ervaren."
        />

        <RejectedPanel expanded />
      </section>

      {/* § 06 — Audit-timeline */}
      <section>
        <SectionHeader
          id="audit"
          marker={section("audit").marker}
          title="Audit-timeline · klantversie"
          fase={section("audit").fase}
          description="Vereenvoudigde geschiedenis op het topic-detail. Geen team-actor-namen, alleen datum + neutrale beschrijving in klanttaal."
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <TopicDetail topic={detailTopic} />
          <AuditTimeline />
        </div>
      </section>

      {/* § 07 — Rapporten-archief */}
      <section>
        <SectionHeader
          id="reports-archive"
          marker={section("reports-archive").marker}
          title="Rapporten-archief"
          fase={section("reports-archive").fase}
          description="Lijst van bevroren wekelijkse rapporten. Het nieuwste rapport bovenaan, ouder werk eronder — zoals een tijdschrift-archief."
        />

        <ReportsList />
      </section>

      {/* § 08 — Rapport-detail */}
      <section>
        <SectionHeader
          id="report-detail"
          marker={section("report-detail").marker}
          title="Rapport-detail"
          fase={section("report-detail").fase}
          description="Het hart van de Portal. Editorial typografie, generous leading, drop cap op de kritische noot. Dit is waar het document-gevoel zwaarder weegt dan dashboard-density — bewust."
        />

        <ReportDetail />
      </section>
    </PreviewShell>
  );
}
