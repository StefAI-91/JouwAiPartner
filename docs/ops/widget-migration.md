# Userback → JAIP Widget Migration

> **Status:** parallel-run gestart bij WG-003-deploy. Cutover wanneer
> criteria onderaan voldaan zijn — geen harde datum.

WG-003 zet de eigen JAIP-feedback-widget op cockpit naast de bestaande
Userback-widget. Beide draaien minimaal 14 dagen parallel zodat we kunnen
vergelijken vóórdat we Userback eruit halen. Dit doc beschrijft hoe we
de cutover bepalen, hoe we 'm uitvoeren en welke gaps we nu accepteren.

## Cutover-criteria (alle drie moeten kloppen)

1. **Stabiliteit** — eigen widget draait ≥ 14 dagen op cockpit zonder
   onverklaarde 500's of bundle-load-failures. Check in Vercel logs +
   DevHub-issues met source `jaip_widget` (mogen geen test-frequentie
   van \"weinig submissions\" hebben door bugs).
2. **Submission-rate vergelijkbaar of hoger** — query hieronder over de
   laatste 14 dagen. JAIP-widget heeft ≥ Userback-volume per dag (toegestaan
   marge: −20%).
3. **Geen gemiste features** — Stef + Wouter + Ege bevestigen expliciet
   dat geen Userback-features ontbreken die ze écht nodig hebben.
   Bekende gap: annotated screenshots (zie §Bekende gaps).

## Submission-rate vergelijkings-query

Tegen de productie-DB:

```sql
-- JAIP widget vs Userback per dag, laatste 14 dagen
select
  date_trunc('day', created_at)::date as day,
  source,
  count(*) as submissions
from issues
where created_at >= now() - interval '14 days'
  and source in ('jaip_widget', 'userback')
group by 1, 2
order by 1 desc, 2;
```

Zet de output in een sheet en kijk of de dagelijkse JAIP-submissions
gemiddeld binnen −20% van Userback liggen. Lager? Eerst onderzoeken
voordat we cutover doen — soms wijst lage rate op een UX-probleem
(modal te ingewikkeld, knop niet zichtbaar genoeg).

## Cutover-stappen (zodra criteria voldaan)

1. **Communicatie** — kondig in #algemeen aan: "Userback gaat eruit op
   datum X". 24u wachten op tegenargumenten.
2. **Userback uit cockpit:**
   - Verwijder `<UserbackProvider />` uit
     `apps/cockpit/src/app/layout.tsx`.
   - Verwijder `apps/cockpit/src/components/shared/userback-provider.tsx`.
   - Verwijder `@userback/widget` uit `apps/cockpit/package.json`.
   - Run `npm install` in de root, commit lockfile.
3. **DevHub-polling stoppen:**
   - DH-007 polling-route uitschakelen (cron in `apps/devhub`).
   - Documenteer in changelog dat Userback-import niet meer draait.
4. **Env-var opruimen:** `NEXT_PUBLIC_USERBACK_TOKEN` verwijderen van
   Vercel (cockpit production + preview). Pas op: `deployment.md`-vermelding
   ook verwijderen.
5. **Userback-account opzeggen** — wachten tot einde lopende factuur-periode,
   anders dubbele kosten.
6. **Smoke-test post-cutover** — feedback-knop op cockpit klikken, melding
   sturen, issue verschijnt in DevHub triage. Als faalt → rollback.

## Rollback

Als er na cutover een blocker opduikt (eigen widget down, bundle-error,
DevHub-ingest faalt):

1. Vercel → cockpit → vorige deploy promoten (Userback-versie).
2. `NEXT_PUBLIC_USERBACK_TOKEN` weer aanzetten.
3. Issue maken in DevHub met root-cause + fix-plan vóór nieuwe poging.

## Bekende gaps

| Gap                            | Impact                                                                                                  | Follow-up                                                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Geen annotated screenshots** | Userback laat gebruikers tekenen op een screenshot. JAIP V0 niet — alleen URL + viewport in de payload. | **WG-006** (gepland): `html2canvas` + draw-overlay. Cutover gaat nu door zonder als team akkoord is dat ze 'm tijdelijk missen. |
| **Geen replay/recordings**     | Userback heeft session-replay bij feedback. Nice-to-have, niet kritiek voor team-dogfood.               | Geen plan; opnemen in v2-overweging als team het écht mist.                                                                     |

## Rate-limit (WG-005)

`/api/ingest/widget` rate-limit'd op **30 POST's per uur per Origin-host**
via een Postgres-counter (`widget_rate_limits`-tabel + atomische
`increment_rate_limit`-RPC). De 31e request binnen het uur krijgt `429`
met `Retry-After`-header tot de volgende uur-grens. Counter reset op
`date_trunc('hour', now())`.

- **Per-Origin, niet per project_id** (WG-005 §Q1) — één klant heeft
  typisch één Origin; per-Origin is makkelijker te triagen.
- **Fail-open bij DB-uitval** (WG-REQ-096) — Postgres-fout = request
  doorlaten. 30 minuten extra spam in triage is hersteldbaar; alle
  feedback per ongeluk weggooien is dat niet.
- **Cleanup** — `pg_cron`-job `cleanup-widget-rate-limits` verwijdert
  rijen ouder dan 24u, draait elk uur. Zonder cleanup groeit de tabel
  lineair.

**Limiet aanpassen:** edit `WIDGET_RATE_LIMIT_PER_HOUR` in
`packages/database/src/constants/widget.ts` en redeploy. Wijziging is
één regel — geen DB-migratie nodig.

**`/api/ingest/userback`** is admin-only (cron + admin-session, geen
public Origin) en draagt om die reden geen rate-limit. Util ondersteunt
de `userback_ingest`-prefix wel zodat een toekomstige public-mode (mocht
die ooit nodig zijn) erop kan plug-en-playen.

## Vergelijkingsperiode-log

Houd hier per week bij:

| Week | JAIP-submissions | Userback-submissions | Notities                             |
| ---- | ---------------- | -------------------- | ------------------------------------ |
| —    | —                | —                    | start parallel-run bij WG-003-deploy |

## Klant-rollout-log (WG-004)

| Datum | Klant | Domein | Eerste-feedback-issue | Notities                                        |
| ----- | ----- | ------ | --------------------- | ----------------------------------------------- |
| —     | —     | —      | —                     | wachten op WG-005 (rate-limit) en go-beslissing |
