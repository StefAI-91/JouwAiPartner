import { DeviceMobile, DeviceDesktop, DeviceRow } from "../followup-suggestions/_components/device";
import { InboxPageFrame } from "./_components/inbox-page-frame";

/**
 * Sketch — AI-coach inbox.
 * Twee buckets: Klanten + Team. AI doet conversational voorstellen
 * ("Hey Stef, zal ik..."). Gebruiker bevestigt, wijzigt, of snoozed.
 *
 * URL: /dev/sketches/inbox
 */
export default function InboxSketchPage() {
  return (
    <div className="mx-auto max-w-[1500px] space-y-12 px-6 py-10">
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          🎨 MOCKUP — ter validatie · AI-coach inbox
        </div>
        <h1 className="text-2xl font-semibold">AI-coach inbox</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          AI maakt conversational voorstellen voor opvolging — naar klanten of intern naar het team.
          Twee soorten items zitten in dezelfde lijst:
        </p>
        <ul className="ml-4 max-w-3xl list-disc space-y-1 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">AI doet voorzet</strong> (sparkles-icoon) — concrete
            mail/ping/overzicht met primary CTA, &quot;Wijzig&quot; en &quot;Niet nu&quot;.
          </li>
          <li>
            <strong className="text-foreground">Reminder</strong> (bell-icoon, gedempte achtergrond)
            — vraagt jouw aandacht maar AI kan geen voorzet maken (creatief / strategisch werk).
            Knoppen: &quot;Ik pak het op&quot; en &quot;Herinner later&quot;.
          </li>
        </ul>
      </header>

      <section className="space-y-4">
        <div className="flex items-baseline gap-3">
          <h2 className="text-xl font-semibold">Tab: Klanten</h2>
          <span className="text-xs text-muted-foreground">Mobile + desktop · 3 mock-meldingen</span>
        </div>
        <DeviceRow>
          <DeviceMobile>
            <InboxPageFrame variant="mobile" activeBucket="klant" />
          </DeviceMobile>
          <DeviceDesktop>
            <InboxPageFrame variant="desktop" activeBucket="klant" />
          </DeviceDesktop>
        </DeviceRow>
      </section>

      <section className="space-y-4">
        <div className="flex items-baseline gap-3">
          <h2 className="text-xl font-semibold">Tab: Team</h2>
          <span className="text-xs text-muted-foreground">Mobile + desktop · 3 mock-meldingen</span>
        </div>
        <DeviceRow>
          <DeviceMobile>
            <InboxPageFrame variant="mobile" activeBucket="intern" />
          </DeviceMobile>
          <DeviceDesktop>
            <InboxPageFrame variant="desktop" activeBucket="intern" />
          </DeviceDesktop>
        </DeviceRow>
      </section>
    </div>
  );
}
