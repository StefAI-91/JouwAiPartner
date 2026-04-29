import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  CornerDownRight,
  Dot,
  MessageSquareText,
  Sparkles,
} from "lucide-react";

const closedThisWeek = [
  {
    id: "JAP-642",
    title: "Witte schermen na inloggen",
    severity: "Critical",
    symptom:
      "Drie gebruikers konden niet inloggen tussen 14:02 en 16:18 op vrijdag — pagina bleef wit na het invoeren van credentials.",
    cause:
      "Race condition in session-refresh: de Userback-widget initialiseerde vóór de auth-handshake en blokkeerde het token-rewrite-event.",
    fix: "Widget-loader verplaatst naar na auth-handshake; session-refresh wacht nu expliciet op auth-state ‘ready’.",
    since: "Donderdag 16:42",
    effect: "0 nieuwe meldingen sinds deploy.",
    closedBy: "Wouter",
  },
  {
    id: "JAP-638",
    title: "Bug-reporter zag eigen ticket niet terug",
    severity: "Hoog",
    symptom:
      "Userback-meldingen kwamen niet terug in de eigen ticketlijst van de melder; alleen team zag ze.",
    cause:
      "Reporter-id werd opgeslagen op de issue maar niet meegenomen in de RLS-policy voor portal-readers.",
    fix: "RLS uitgebreid met reporter-clause; backfill gedraaid op 412 historische tickets.",
    since: "Woensdag 11:08",
    effect: "Alle 412 historische tickets nu zichtbaar voor reporters.",
    closedBy: "Ege",
  },
  {
    id: "JAP-629",
    title: "Dubbele e-mailmeldingen bij issue-update",
    severity: "Midden",
    symptom: "Bij elke comment kreeg de assignee twee identieke e-mails.",
    cause:
      "Webhook van GitHub triggerde dezelfde notificatie als de in-app comment-trigger, beide door de mailer-pipeline opgepakt.",
    fix: "Idempotency-key toegevoegd op (issue_id, comment_hash, recipient); duplicates worden binnen 60s afgevangen.",
    since: "Maandag 09:24",
    effect: "Mailvolume −41% deze week.",
    closedBy: "Wouter",
  },
];

const openRisks = [
  {
    title: "Metadata-prefill bij bugreports nog niet live",
    impact: "Reporter-info ontbreekt op nieuwe meldingen → triage trager.",
    status: "Ingepland week 19",
    severity: "warn" as const,
  },
  {
    title: "E-mail-pipeline draait nog op Cohere v3",
    impact: "Lagere embedding-kwaliteit op recente threads.",
    status: "Backlog · geen ETA",
    severity: "warn" as const,
  },
  {
    title: "Geen automatische backup op staging-DB",
    impact: "Bij een corrupte seed verliezen we max 24u test-data.",
    status: "Acceptabel risico — staging only",
    severity: "info" as const,
  },
];

const inProgress = [
  {
    id: "JAP-651",
    title: "Tweefactor-login (TOTP)",
    owner: "Wouter",
    since: "3 dagen",
    bucket: "Sprint 18",
  },
  {
    id: "JAP-647",
    title: "Userback v2 widget upgrade",
    owner: "Ege",
    since: "1 dag",
    bucket: "Sprint 18",
  },
  {
    id: "JAP-655",
    title: "CSV-export op de issue-lijst",
    owner: "Wouter",
    since: "5 uur",
    bucket: "Sprint 18",
  },
];

const waitingOnYou = [
  {
    title: "Tekst voor onboarding-screen aanleveren",
    since: "3 dagen open",
    blockingFor: "JAP-651 · Tweefactor-login",
  },
  {
    title: "Goedkeuring SLA-voorstel v2",
    since: "1 dag open",
    blockingFor: "Contract-bijlage week 19",
  },
];

const roadmapColumns = [
  {
    label: "Ingepland · sprint 18",
    accent: "var(--moss)",
    items: [
      { name: "Tweefactor-login", est: "6u", note: "in review" },
      { name: "Userback v2 widget", est: "4u", note: "" },
      { name: "CSV-export", est: "3u", note: "" },
    ],
  },
  {
    label: "Wacht op jouw keuze",
    accent: "var(--rust)",
    items: [
      {
        name: "Slack-integratie voor meldingen",
        est: "12u",
        note: "vraagt vrijgave kanaal-budget",
      },
      {
        name: "Bulk-import CSV (klanten)",
        est: "8u",
        note: "scope-vraag uit",
      },
    ],
  },
  {
    label: "Bewust uitgesteld",
    accent: "var(--amber)",
    items: [
      {
        name: "Mobiele app",
        est: "—",
        note: "reden: focus op web-stabiliteit Q2",
      },
      {
        name: "AI-suggesties op feedback-form",
        est: "—",
        note: "reden: wacht op verifier-flow",
      },
    ],
  },
];

export default function PreviewPage() {
  return (
    <div className="paper-noise min-h-screen">
      <div className="mx-auto max-w-[1240px] px-8 py-10 lg:px-14 lg:py-14">
        {/* HEADER ─────────────────────────────────────────────── */}
        <header
          className="reveal flex items-baseline justify-between gap-6"
          style={{ animationDelay: "40ms" }}
        >
          <div className="flex items-baseline gap-5">
            <span className="label">Jouw AI Partner</span>
            <span className="h-3 w-px bg-[var(--hairline)]" aria-hidden />
            <span className="label" style={{ color: "var(--ink)" }}>
              Connect-CRM
            </span>
          </div>
          <div className="flex items-baseline gap-5">
            <span className="label">Week 18 · 2026</span>
            <span className="h-3 w-px bg-[var(--hairline)]" aria-hidden />
            <span className="flex items-center gap-2">
              <span className="live-dot inline-block h-[7px] w-[7px] rounded-full" />
              <span className="label" style={{ color: "var(--ink)" }}>
                Live · ververst 14:32
              </span>
            </span>
          </div>
        </header>

        <div className="rule-hair mt-6" />

        {/* MASTHEAD ───────────────────────────────────────────── */}
        <section
          className="reveal mt-10 flex items-end justify-between gap-10"
          style={{ animationDelay: "120ms" }}
        >
          <div>
            <p className="label mb-3">De briefing — Maandag 27 april 2026</p>
            <h1 className="display text-[64px] leading-[0.96] lg:text-[88px]">
              Stabieler dan
              <br />
              vorige week.
            </h1>
          </div>
          <div className="hidden shrink-0 text-right lg:block">
            <p className="display text-[14px] italic text-[var(--ink-2)]">
              &mdash; geschreven door agent <span className="not-italic">·</span> <br />
              gecontroleerd door Wouter, 09:14
            </p>
          </div>
        </section>

        <div className="rule-thick mt-8" />

        {/* STATUS STRIP ───────────────────────────────────────── */}
        <section
          className="reveal mt-6 grid grid-cols-12 gap-x-10 gap-y-4"
          style={{ animationDelay: "200ms" }}
        >
          <div className="col-span-12 lg:col-span-8">
            <p className="label mb-2">Systeem-status, dit moment</p>
            <p className="display text-[28px] leading-[1.15] text-[var(--ink)]">
              <span className="live-dot mr-3 inline-block h-[10px] w-[10px] -translate-y-[3px] rounded-full align-middle" />
              Geen actieve incidenten.{" "}
              <span className="text-[var(--ink-3)]">
                Laatste deploy gisteren 16:42 · 1.402 requests in het laatste uur · 0 errors boven
                p1.
              </span>
            </p>
          </div>
          <div className="col-span-12 grid grid-cols-3 gap-6 lg:col-span-4">
            <Stat label="Verzonden" value="3" caption="deze week" />
            <Stat label="Open" value="12" caption="totaal" />
            <Stat label="Vertraagd" value="1" caption="boven SLA" tone="warn" />
          </div>
        </section>

        {/* BRIEFING + SLA ─────────────────────────────────────── */}
        <section
          className="reveal mt-14 grid grid-cols-12 gap-x-12 gap-y-10"
          style={{ animationDelay: "300ms" }}
        >
          <article className="col-span-12 lg:col-span-8">
            <p className="label mb-4 inline-flex items-center gap-2">
              <Sparkles className="h-3 w-3" /> Hoofdpunt van de week
            </p>
            <p className="display text-[34px] leading-[1.18] text-[var(--ink)] lg:text-[40px]">
              Backend-stabiliteit verbeterd na het <span className="marker">inlog-incident</span>{" "}
              van vrijdag. Drie meldingen gesloten met dezelfde root cause in de Userback-koppeling.
              Eén feature wacht expliciet op <span className="marker">jouw keuze</span> &mdash; zie
              de roadmap hieronder.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-[var(--ink-3)]">
              <span className="rounded-sm border border-[var(--hairline)] px-2 py-[3px]">
                Concept door agent <span className="num">claude-sonnet-4.6</span>
              </span>
              <span>·</span>
              <span>
                Gecheckt door <span className="text-[var(--ink)]">Wouter</span> vanmorgen 09:14
              </span>
              <span>·</span>
              <a className="inline-flex items-center gap-1 underline">
                bron-issues <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
          </article>

          <aside className="col-span-12 lg:col-span-4">
            <div className="border border-[var(--rule)] bg-[var(--paper-2)] p-6">
              <p className="label mb-4">SLA · april</p>
              <SlaRow label="P1 — kritiek" target="< 2u" actual="38m" ok />
              <SlaRow label="P2 — hoog" target="< 8u" actual="3u 14m" ok />
              <SlaRow label="P3 — midden" target="< 24u" actual="26u 12m" ok={false} />
              <SlaRow label="P4 — laag" target="< 5d" actual="2d 4u" ok />
              <div className="rule-hair my-5" />
              <div className="flex items-baseline justify-between">
                <span className="label">Geslaagd</span>
                <span className="num text-[20px] text-[var(--ink)]">9 / 10</span>
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-[var(--ink-3)]">
                Eén P3-overschrijding deze maand. Reden: feedbackloop met jou over ticket #JAP-617
                duurde 19u langer dan gepland.
              </p>
            </div>
          </aside>
        </section>

        <div className="rule-thick mt-16" />

        {/* GESLOTEN + RISICO'S ────────────────────────────────── */}
        <section
          className="reveal mt-10 grid grid-cols-12 gap-x-12 gap-y-12"
          style={{ animationDelay: "380ms" }}
        >
          <div className="col-span-12 lg:col-span-8">
            <header className="mb-6 flex items-baseline justify-between">
              <h2 className="display text-[28px] leading-none">Gesloten deze week</h2>
              <span className="label">Symptoom &middot; oorzaak &middot; effect</span>
            </header>
            <ul>
              {closedThisWeek.map((item, i) => (
                <li
                  key={item.id}
                  className="ledger-row group grid grid-cols-12 gap-6 border-t border-[var(--hairline)] py-7 last:border-b"
                >
                  <div className="col-span-12 flex items-baseline gap-4 lg:col-span-3">
                    <span className="num text-[12px] text-[var(--ink-3)]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <span className="num text-[12px] text-[var(--ink-3)]">{item.id}</span>
                      <p className="display text-[20px] leading-tight text-[var(--ink)]">
                        {item.title}
                      </p>
                      <span className="mt-1 inline-block text-[11px] uppercase tracking-[0.16em] text-[var(--rust)]">
                        {item.severity}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-12 grid gap-3 text-[14px] leading-relaxed text-[var(--ink-2)] lg:col-span-9">
                    <p>
                      <span className="label mr-2">Symptoom</span>
                      {item.symptom}
                    </p>
                    <p>
                      <span className="label mr-2">Oorzaak</span>
                      {item.cause}
                    </p>
                    <p>
                      <span className="label mr-2">Fix</span>
                      {item.fix}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-[var(--ink-3)]">
                      <span className="inline-flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[var(--moss)]" />
                        Sinds {item.since}
                      </span>
                      <span>·</span>
                      <span>{item.effect}</span>
                      <span>·</span>
                      <span>
                        Gesloten door <span className="text-[var(--ink)]">{item.closedBy}</span>
                      </span>
                      <span className="ml-auto inline-flex items-center gap-1 text-[var(--ink)] opacity-0 transition group-hover:opacity-100">
                        <MessageSquareText className="h-3.5 w-3.5" />
                        commentaar
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <aside className="col-span-12 lg:col-span-4">
            <header className="mb-6 flex items-baseline justify-between">
              <h2 className="display text-[24px] leading-none">Open risico&apos;s</h2>
              <span className="label">Eerlijk lijstje</span>
            </header>
            <ul className="space-y-5">
              {openRisks.map((risk) => (
                <li
                  key={risk.title}
                  className="border-l-2 pl-4"
                  style={{
                    borderColor: risk.severity === "warn" ? "var(--amber)" : "var(--hairline)",
                  }}
                >
                  <p className="display text-[17px] leading-snug text-[var(--ink)]">{risk.title}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-[var(--ink-2)]">
                    {risk.impact}
                  </p>
                  <p className="mt-2 text-[12px] uppercase tracking-[0.14em] text-[var(--ink-3)]">
                    {risk.status}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[12px] leading-relaxed text-[var(--ink-3)]">
              Wat hier staat is wat we <em>weten</em> dat nog wringt. Mis je iets? Reageer op een
              ticket of stel een vraag — dan komt het hier terug.
            </p>
          </aside>
        </section>

        <div className="rule-thick mt-16" />

        {/* IN BEHANDELING + WACHTEN OP JOU ───────────────────── */}
        <section
          className="reveal mt-10 grid grid-cols-12 gap-x-12 gap-y-12"
          style={{ animationDelay: "460ms" }}
        >
          <div className="col-span-12 lg:col-span-8">
            <header className="mb-6 flex items-baseline justify-between">
              <h2 className="display text-[28px] leading-none">Nu in behandeling</h2>
              <a className="label inline-flex items-center gap-1 underline">
                Hele backlog <ArrowUpRight className="h-3 w-3" />
              </a>
            </header>
            <ul className="grid gap-3">
              {inProgress.map((item) => (
                <li
                  key={item.id}
                  className="ledger-row group grid grid-cols-12 items-baseline gap-4 border border-[var(--hairline)] px-5 py-4 transition hover:border-[var(--ink)]"
                >
                  <span className="num col-span-2 text-[12px] text-[var(--ink-3)] lg:col-span-1">
                    {item.id}
                  </span>
                  <p className="display col-span-10 text-[18px] leading-tight text-[var(--ink)] lg:col-span-6">
                    {item.title}
                  </p>
                  <span className="col-span-6 text-[13px] text-[var(--ink-2)] lg:col-span-2">
                    {item.owner}
                  </span>
                  <span className="col-span-3 text-[13px] text-[var(--ink-3)] lg:col-span-2">
                    sinds {item.since}
                  </span>
                  <span className="col-span-3 inline-flex justify-end text-[11px] uppercase tracking-[0.14em] text-[var(--rust)] lg:col-span-1">
                    {item.bucket}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <aside className="col-span-12 lg:col-span-4">
            <header className="mb-6">
              <h2 className="display text-[24px] leading-none">Wacht op jou</h2>
              <p className="mt-2 text-[13px] text-[var(--ink-3)]">
                Twee dingen vertragen ons aan jouw kant. Niet erg — wel handig om te weten.
              </p>
            </header>
            <ul className="space-y-5">
              {waitingOnYou.map((item) => (
                <li
                  key={item.title}
                  className="border-t border-[var(--hairline)] pt-4 first:border-t-0 first:pt-0"
                >
                  <div className="flex items-start gap-3">
                    <CornerDownRight className="mt-1 h-4 w-4 shrink-0 text-[var(--rust)]" />
                    <div>
                      <p className="display text-[18px] leading-snug text-[var(--ink)]">
                        {item.title}
                      </p>
                      <p className="mt-1 inline-flex items-center gap-1 text-[12px] text-[var(--ink-3)]">
                        <Clock3 className="h-3 w-3" /> {item.since}
                      </p>
                      <p className="mt-2 text-[12px] text-[var(--ink-2)]">
                        Houdt tegen: {item.blockingFor}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        </section>

        <div className="rule-thick mt-16" />

        {/* ROADMAP-KEUZES ─────────────────────────────────────── */}
        <section className="reveal mt-10" style={{ animationDelay: "540ms" }}>
          <header className="mb-8 flex items-baseline justify-between">
            <h2 className="display text-[28px] leading-none">Roadmap &mdash; keuzes deze maand</h2>
            <span className="label">Wat we doen, wat wacht, wat we bewust laten liggen</span>
          </header>
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
            {roadmapColumns.map((col) => (
              <div key={col.label}>
                <div className="mb-4 flex items-center gap-2" style={{ color: col.accent }}>
                  <Dot className="h-6 w-6 -ml-2" strokeWidth={4} />
                  <span className="label" style={{ color: col.accent }}>
                    {col.label}
                  </span>
                </div>
                <ul className="space-y-5 border-t border-[var(--hairline)] pt-5">
                  {col.items.map((item) => (
                    <li key={item.name}>
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="display text-[20px] leading-tight text-[var(--ink)]">
                          {item.name}
                        </p>
                        <span className="num shrink-0 text-[13px] text-[var(--ink-3)]">
                          {item.est}
                        </span>
                      </div>
                      {item.note && (
                        <p className="mt-1 text-[12px] italic leading-relaxed text-[var(--ink-3)]">
                          {item.note}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <div className="rule-thick mt-16" />

        {/* FOOTER ─────────────────────────────────────────────── */}
        <footer
          className="reveal mt-8 flex flex-wrap items-baseline justify-between gap-6 pb-12"
          style={{ animationDelay: "620ms" }}
        >
          <p className="text-[12px] leading-relaxed text-[var(--ink-3)]">
            Deze pagina is een levend document. Elke regel is een belofte die we nakomen, een keuze
            die we uitleggen, of iets wat we nog moeten doen.
            <br />
            Niet eens met iets? Klik op een ticket en zeg het — Stef of Wouter ziet het binnen 24
            uur.
          </p>
          <div className="flex flex-wrap items-baseline gap-6 text-[12px]">
            <FooterLink>SLA-contract</FooterLink>
            <FooterLink>Volgende meeting · do 1 mei, 14:00</FooterLink>
            <FooterLink>Stel een vraag</FooterLink>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  caption,
  tone,
}: {
  label: string;
  value: string;
  caption: string;
  tone?: "warn";
}) {
  return (
    <div>
      <p className="label">{label}</p>
      <p
        className="num mt-1 text-[36px] leading-none"
        style={{ color: tone === "warn" ? "var(--rust)" : "var(--ink)" }}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[var(--ink-3)]">{caption}</p>
    </div>
  );
}

function SlaRow({
  label,
  target,
  actual,
  ok,
}: {
  label: string;
  target: string;
  actual: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between border-b border-dashed border-[var(--hairline)] py-2 last:border-b-0">
      <span className="text-[13px] text-[var(--ink-2)]">{label}</span>
      <span className="flex items-baseline gap-3">
        <span className="num text-[11px] text-[var(--ink-3)]">{target}</span>
        <span className="num text-[14px]" style={{ color: ok ? "var(--moss)" : "var(--signal)" }}>
          {actual}
        </span>
      </span>
    </div>
  );
}

function FooterLink({ children }: { children: React.ReactNode }) {
  return (
    <a className="group inline-flex items-baseline gap-1 underline decoration-[var(--hairline)] underline-offset-4 transition hover:decoration-[var(--ink)]">
      {children}
      <ArrowUpRight className="h-3 w-3 transition group-hover:-translate-y-[1px] group-hover:translate-x-[1px]" />
    </a>
  );
}
