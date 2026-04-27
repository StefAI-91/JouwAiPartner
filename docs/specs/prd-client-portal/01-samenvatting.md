# 1. Samenvatting

De JAIP Client Portal is een client-facing webapp die klanten één bron van waarheid geeft voor de status van bugs, features en deliverables in hun project. Het vervangt het wekelijks rondsturen van losse rapportages, Notion-documenten en Slack-updates die nu tot tegenstrijdige informatie leiden. De portal is een nieuwe app binnen de bestaande JAIP monorepo (DevHub + Cockpit + Client Portal delen reeds dezelfde Supabase-database) en wordt gebouwd met Next.js, Tailwind, shadcn/ui en magic link auth via Supabase.

Deze v1 ("Stefan First") richt zich op de directe pijn van Stefan Roevros (CAI): een overzichtelijk vier-bucket overzicht van issues zonder interne ruis. Voting, sign-off en comments worden in v2 toegevoegd zonder breaking changes.
