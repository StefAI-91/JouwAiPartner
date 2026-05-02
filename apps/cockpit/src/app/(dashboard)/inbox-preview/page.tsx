import { Sparkles } from "lucide-react";
import { CockpitInboxMock } from "@/components/inbox-preview/cockpit-inbox-mock";
import { PortalInboxMock } from "@/components/inbox-preview/portal-inbox-mock";
import { DeviceFrame } from "@/components/inbox-preview/device-frame";

export const metadata = {
  title: "Inbox Blueprint · Cockpit",
};

/**
 * Inbox-blueprint: visualisatie van de Customer-Communication-laag uit
 * sprints CC-001 t/m CC-006. Pure mockup — geen DB, geen mutations.
 *
 * Twee schermen naast elkaar tonen hoe team en klant dezelfde inbox vanuit
 * twee perspectieven beleven. Mock-data leeft in `mock-data.ts`; alle
 * styling via design-tokens uit `globals.css`.
 */
export default function InboxBlueprintPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <BackgroundOrnament />

      <div className="relative mx-auto max-w-[1640px] px-6 pt-12 pb-24 sm:px-10">
        <Hero />

        <div className="mt-14 grid grid-cols-1 gap-10 xl:grid-cols-[1.3fr_1fr] xl:gap-12">
          <DeviceFrame
            url="cockpit.jouwaipartner.nl/inbox"
            caption="Team · Cockpit"
            index="I"
            variant="team"
          >
            <CockpitInboxMock />
          </DeviceFrame>

          <DeviceFrame
            url="portal.jouwaipartner.nl/projects/acme/inbox"
            caption="Klant · Portal"
            index="II"
            variant="client"
          >
            <PortalInboxMock />
          </DeviceFrame>
        </div>

        <FeatureLegend />
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
      <div>
        <div className="flex items-center gap-2 text-[11px] tracking-[0.22em] text-muted-foreground/80 uppercase">
          <span className="inline-flex h-5 items-center gap-1 rounded-full bg-primary/10 px-2 font-medium text-primary tracking-wider normal-case">
            <Sparkles className="h-3 w-3" /> Mockup
          </span>
          <span>Customer Communication · CC-001 → CC-006</span>
        </div>

        <h1 className="font-serif-display mt-4 text-[clamp(2.5rem,5vw,4.25rem)] leading-[0.95] tracking-tight text-foreground">
          Twee schermen,
          <br />
          <span className="italic text-foreground/60">één gesprek.</span>
        </h1>

        <p className="mt-5 max-w-[58ch] text-[15px] leading-relaxed text-muted-foreground">
          Klant-feedback en vrije berichten — gerouteerd door één gedeelde inbox-laag. Hieronder het
          ontwerp zoals team en klant het zullen zien zodra de Customer-Communication-sprints
          landen. Mens-naar-mens v1; AI-drafts (CC-004) komen later bovenop.
        </p>
      </div>

      <dl className="grid grid-cols-3 gap-x-8 gap-y-1 text-right lg:text-left">
        <Stat label="Sprints" value="5" />
        <Stat label="Statussen" value="10" />
        <Stat label="Templates" value="7" />
      </dl>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] tracking-[0.18em] text-muted-foreground/70 uppercase">{label}</dt>
      <dd className="font-serif-display text-3xl leading-none tracking-tight text-foreground">
        {value}
      </dd>
    </div>
  );
}

function FeatureLegend() {
  const rows: Array<{ sprint: string; team: string; client: string }> = [
    {
      sprint: "CC-001",
      team: "Inbox-pagina, status-secties, 4 PM-acties (endorse/decline/defer/convert)",
      client: "Nieuwe portal-statussen — 'Ontvangen', 'Afgewezen + reden', 'Geparkeerd'",
    },
    {
      sprint: "CC-002",
      team: "Sidebar-counter update bij elk event",
      client: "Mail bij elke status-actie met deeplink terug naar portal",
    },
    {
      sprint: "CC-003",
      team: "Bron-badges 'Klant-PM' (violet) / 'Eindgebruiker' (oranje) op feedback",
      client: "—",
    },
    {
      sprint: "CC-004",
      team: "🅿️ Gedeferred — AI-draft + review-gate komt later bovenop bestaande flow",
      client: "—",
    },
    {
      sprint: "CC-005",
      team: "Per-project tab + onboarding-card bij eerste bezoek",
      client: "Onboarding-card bij eerste portal-bezoek",
    },
    {
      sprint: "CC-006",
      team: "'+ Nieuw bericht' compose (mens-naar-mens), threaded conversation-detail",
      client: "'+ Nieuw bericht aan team' + threaded view",
    },
  ];

  return (
    <section className="mt-20 grid grid-cols-1 gap-12 border-t border-border/50 pt-10 lg:grid-cols-[auto_1fr]">
      <div>
        <p className="text-[10px] tracking-[0.22em] text-muted-foreground/80 uppercase">Legenda</p>
        <h2 className="font-serif-display mt-2 text-3xl leading-tight text-foreground">
          Welke sprint
          <br />
          <span className="italic text-foreground/60">welke laag.</span>
        </h2>
      </div>

      <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/[0.06]">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-muted/40">
            <tr className="text-[10px] tracking-[0.16em] text-muted-foreground/80 uppercase">
              <th className="px-5 py-3 font-medium">Sprint</th>
              <th className="px-5 py-3 font-medium">Team-zijde (cockpit)</th>
              <th className="px-5 py-3 font-medium">Klant-zijde (portal)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.sprint}
                className="border-t border-border/40 align-top transition hover:bg-muted/20"
              >
                <td className="px-5 py-4 font-mono text-[12px] font-medium text-primary">
                  {row.sprint}
                </td>
                <td className="px-5 py-4 leading-relaxed text-foreground/85">{row.team}</td>
                <td className="px-5 py-4 leading-relaxed text-foreground/85">{row.client}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BackgroundOrnament() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-32 -right-32 h-[640px] w-[640px] rounded-full bg-primary/[0.04] blur-3xl" />
      <div className="absolute top-[40%] -left-40 h-[520px] w-[520px] rounded-full bg-[oklch(0.55_0.12_280)]/[0.05] blur-3xl" />
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.018]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <filter id="blueprint-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="3"
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#blueprint-grain)" />
      </svg>
    </div>
  );
}
