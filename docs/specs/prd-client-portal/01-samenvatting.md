# 1. Samenvatting

De JAIP Client Portal is een client-facing webapp die klanten één bron van waarheid geeft voor de status van bugs, features en deliverables in hun project. Het vervangt het wekelijks rondsturen van losse rapportages, Notion-documenten en Slack-updates die nu tot tegenstrijdige informatie leiden. De portal bestaat al als app `apps/portal` in de JAIP monorepo (DevHub + Cockpit + Client Portal delen dezelfde Supabase-database). Tech: Next.js 16 (App Router) + React 19 + Tailwind v4 (CSS-first) + shadcn/ui + Supabase Auth (email-OTP).

Deze v1 ("Stefan First") richt zich op de directe pijn van Stefan Roevros (CAI): een overzichtelijk vier-bucket overzicht van issues met een duidelijke switch tussen "Onze meldingen" (door klant aangedragen) en "JAIP-meldingen" (door JAIP-team). De vier buckets zijn `Ontvangen`, `Ingepland`, `In behandeling`, `Afgerond` (zoals bestaand in `PORTAL_STATUS_GROUPS`). Voting, sign-off en comments worden in v2 toegevoegd zonder breaking changes.

> Deze PRD vervangt `docs/specs/portal-mvp.md` (gearchiveerd). Wat in `portal-mvp.md` al opgeleverd was (auth, RLS, project-overzicht, app-scaffolding, feedback-formulier) is hier alleen ter context opgenomen — de inhoudelijke nieuwigheid zit in het vier-bucket dashboard met source-switch en de optionele klant-vriendelijke titels/beschrijvingen.
