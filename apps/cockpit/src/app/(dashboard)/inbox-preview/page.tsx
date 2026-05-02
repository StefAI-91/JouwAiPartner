import { Sparkles } from "lucide-react";
import { CockpitInboxLinear } from "@/components/inbox-preview/cockpit-inbox-linear";
import { PortalInboxMail } from "@/components/inbox-preview/portal-inbox-mail";
import { ConversationCockpit } from "@/components/inbox-preview/conversation-cockpit";
import { ConversationPortal } from "@/components/inbox-preview/conversation-portal";
import { DeviceFrame } from "@/components/inbox-preview/device-frame";

export const metadata = {
  title: "Inbox Blueprint · Cockpit",
};

/**
 * Inbox-blueprint: definitieve design voor de Customer-Communication-laag.
 * Pure mockup — geen DB, geen mutations.
 *
 * Drie secties:
 *   I.   8 design-principes die het ontwerp verantwoorden
 *   II.  Overzicht — Linear voor cockpit, Apple Mail voor portal
 *   III. Conversation-detail — chat-thread met iMessage-bubbles
 */
export default function InboxBlueprintPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <BackgroundOrnament />

      <div className="relative mx-auto max-w-[1640px] px-6 pt-12 pb-32 sm:px-10">
        <Hero />

        <Principles />

        <SectionLabel
          number="II"
          title="Overzicht"
          subtitle="Cockpit volgt Linear-conventies (dichte rij, hover-actions, time-grouping). Portal volgt Apple Mail (avatar + sender + subject + status). Bold = ongelezen — vertrouwd patroon dat klanten al 30 jaar kennen."
        />

        <div className="grid grid-cols-1 gap-10 xl:grid-cols-[1.3fr_1fr] xl:gap-12">
          <DeviceFrame
            url="cockpit.jouwaipartner.nl/inbox"
            caption="Team · Cockpit"
            index="I"
            variant="team"
          >
            <CockpitInboxLinear />
          </DeviceFrame>
          <DeviceFrame
            url="portal.jouwaipartner.nl/projects/acme/inbox"
            caption="Klant · Portal"
            index="II"
            variant="client"
          >
            <PortalInboxMail />
          </DeviceFrame>
        </div>

        <SectionLabel
          number="III"
          title="Conversation-detail"
          subtitle="Klikken op een rij opent het gesprek. iMessage-conventie: jouw bericht rechts, ander links. Voor PM een action-bar bovenaan; voor klant alleen reply-form."
        />

        <div className="grid grid-cols-1 gap-10 xl:grid-cols-2 xl:gap-12">
          <DeviceFrame
            url="cockpit.jouwaipartner.nl/inbox/zon-q1-crm"
            caption="Cockpit · detail"
            index="III"
            variant="team"
          >
            <ConversationCockpit />
          </DeviceFrame>
          <DeviceFrame
            url="portal.jouwaipartner.nl/projects/zonnehof/inbox/q1-crm"
            caption="Portal · detail"
            index="IV"
            variant="client"
          >
            <ConversationPortal />
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
            <Sparkles className="h-3 w-3" /> Definitief
          </span>
          <span>Customer Communication · CC-001 → CC-006</span>
        </div>

        <h1 className="font-serif-display mt-4 text-[clamp(2.5rem,5vw,4.25rem)] leading-[0.95] tracking-tight text-foreground">
          Twee schermen,
          <br />
          <span className="italic text-foreground/60">één gesprek.</span>
        </h1>

        <p className="mt-5 max-w-[60ch] text-[15px] leading-relaxed text-muted-foreground">
          Klant-feedback en vrije berichten — gerouteerd door één gedeelde inbox-laag. Linear voor
          team, Apple Mail voor klant, iMessage voor het gesprek zelf. Vertrouwde mentale modellen,
          geen heruitvinden.
        </p>
      </div>

      <dl className="grid grid-cols-3 gap-x-8 gap-y-1 text-right lg:text-left">
        <Stat label="Sprints" value="5" />
        <Stat label="Schermen" value="4" />
        <Stat label="Principes" value="8" />
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

function Principles() {
  const principles: Array<{ n: string; title: string; body: string }> = [
    {
      n: "01",
      title: "Default rust, action on hover",
      body: "Een inbox is een leesoppervlak. Acties verschijnen als je ze nodig hebt. Vier knoppen op elke rij = visuele schreeuw.",
    },
    {
      n: "02",
      title: "Vertrouwde mentale modellen lenen",
      body: "Voor klant: email-app (Apple Mail / Gmail). Voor PM: action-list (Linear, Plain.com). Niet uitvinden wat al werkt.",
    },
    {
      n: "03",
      title: "Time-grouping over timestamps",
      body: "“Vandaag · Eerder deze week” scant sneller dan “2u geleden · 1d geleden”. Mensen denken in dagen, niet uren.",
    },
    {
      n: "04",
      title: "Status volgt perspectief",
      body: "PM ziet ‘wacht op mij’ — actief, eerstepersoons. Klant ziet ‘status van mijn meldingen’ — passief, observerend.",
    },
    {
      n: "05",
      title: "Sender vs title — kies één",
      body: "Bij messaging-rij is de afzender voorop. Bij feedback-rij is de title voorop. Verschillende kinds, verschillende hiërarchie.",
    },
    {
      n: "06",
      title: "Bold = ongelezen, regular = gelezen",
      body: "Het oudste inbox-signaal dat bestaat. Niet vervangen door iconen, dots of kleuren. Letters doen het werk.",
    },
    {
      n: "07",
      title: "Detail = chat, niet email",
      body: "Threads zijn gesprekken, niet brieven. iMessage-bubbles, jouw bericht rechts, reply-form vast onderaan.",
    },
    {
      n: "08",
      title: "Acties scheiden van leeswerk",
      body: "PM endorse/decline-bar boven de body, reply-form onder. Niet door elkaar gemixt — leeshouding ≠ doe-houding.",
    },
  ];

  return (
    <>
      <SectionLabel
        number="I"
        title="Principes"
        subtitle="Acht uitspraken die elke design-keuze hieronder verantwoorden. Wijk je af, schrijf je af."
      />
      <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
        {principles.map((p) => (
          <article key={p.n} className="border-t border-border/60 pt-3">
            <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground/60">
              {p.n}
            </span>
            <h3 className="font-serif-display mt-1 text-[18px] leading-tight tracking-tight text-foreground">
              {p.title}
            </h3>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">{p.body}</p>
          </article>
        ))}
      </div>
    </>
  );
}

function SectionLabel({
  number,
  title,
  subtitle,
}: {
  number: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mt-24 mb-10 grid grid-cols-1 gap-2 lg:grid-cols-[auto_1fr] lg:gap-10 lg:items-baseline">
      <span className="font-serif-display text-5xl leading-none tracking-tight text-foreground/30 italic">
        {number}.
      </span>
      <div>
        <h2 className="font-serif-display text-[clamp(1.75rem,3vw,2.5rem)] leading-tight tracking-tight text-foreground">
          {title}
        </h2>
        <p className="mt-2 max-w-[68ch] text-[14px] leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
      </div>
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
    <section className="mt-24 grid grid-cols-1 gap-12 border-t border-border/50 pt-10 lg:grid-cols-[auto_1fr]">
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
