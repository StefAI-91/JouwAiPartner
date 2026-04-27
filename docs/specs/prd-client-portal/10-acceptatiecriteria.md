# 10. Acceptatiecriteria

Het project (v1) is opgeleverd wanneer:

- [ ] Stefan Roevros kan inloggen via email-OTP en ziet uitsluitend CAI-issues
- [ ] Dashboard toont vier buckets (Ontvangen / Ingepland / In behandeling / Afgerond) met correcte tellingen en mapping uit `PORTAL_STATUS_GROUPS`
- [ ] Tab-filter Bugs/Features werkt
- [ ] Issue-detailpagina toont `client_title`/`client_description` met fallback naar `title`/`description`
- [ ] Productie-issues worden automatisch zichtbaar via label-regel (`production` / `customer-impact`)
- [ ] JAIP-admin kan in DevHub issue-editor handmatig `client_visible` + `client_visible_override` toggelen + `client_title`/`client_description` invullen
- [ ] RLS getest: testaccount van andere klant ziet geen CAI-data; client zonder `client_visible` ziet issue niet
- [ ] Mobiele weergave werkt op iPhone Safari en Android Chrome
- [ ] Deployed op Vercel achter eigen subdomein
- [ ] Audit-log registreert visibility-wijzigingen
- [ ] Stefan heeft minimaal één keer ingelogd en het overzicht bekeken (validatie-meeting gepland)
- [ ] Alle features uit sectie 5 voldoen aan hun individuele acceptatiecriteria
