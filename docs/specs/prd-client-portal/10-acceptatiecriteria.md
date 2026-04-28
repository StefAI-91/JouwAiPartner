# 10. Acceptatiecriteria

Het project (v1) is opgeleverd wanneer:

- [ ] Stefan Roevros kan inloggen via email-OTP en ziet uitsluitend CAI-issues
- [ ] Dashboard toont vier buckets (Ontvangen / Ingepland / In behandeling / Afgerond) met correcte tellingen en mapping uit `PORTAL_STATUS_GROUPS`
- [ ] Source-switch toont juiste subset:
  - "Onze meldingen" → `source IN ('portal','userback')`
  - "JAIP-meldingen" → `source IN ('manual','ai')`
  - "Alles" → geen filter
- [ ] Type-filter (Alles / Bugs / Features / Vragen) werkt orthogonaal aan source-switch en dekt het volledige `ISSUE_TYPES`-enum
- [ ] Issue-detailpagina toont `client_title`/`client_description` met fallback naar `title`/`description`
- [ ] JAIP-admin kan in DevHub issue-editor `client_title` en `client_description` invullen en opslaan
- [ ] Feedback-formulier (CP-005) blijft functioneel: ingediend issue verschijnt direct in dashboard onder "Onze meldingen"
- [ ] RLS getest: testaccount van andere klant ziet geen CAI-data
- [ ] Mobiele weergave werkt op iPhone Safari en Android Chrome
- [ ] Deployed op `https://portal.jouw-ai-partner.nl/`
- [ ] `apps/portal/vercel.json` aanwezig (deploy-pariteit met Cockpit/DevHub)
- [ ] Stefan heeft minimaal één keer ingelogd en het overzicht bekeken (validatie-meeting gepland)
- [ ] Alle features uit sectie 5 voldoen aan hun individuele acceptatiecriteria
