# Incident Protocol

**Datum:** 2026-03-30
**Doel:** Beslisboom bij security incidents (Wouter punt 4)

---

## Contactpersonen

| Rol               | Naam                  | Telefoon       | Bereikbaar        |
| ----------------- | --------------------- | -------------- | ----------------- |
| Technisch lead    | Stef Banninga         | [invullen]     | Ma-Vr 09:00-18:00 |
| Strategisch/klant | Wouter van den Heuvel | +316 1221 3333 | Ma-Vr 09:00-18:00 |

---

## Stap 1: Classificatie

Bepaal het type incident:

| Type                         | Voorbeelden                                          | Ernst   |
| ---------------------------- | ---------------------------------------------------- | ------- |
| **Data lek**                 | Klantdata zichtbaar voor onbevoegden, API key gelekt | Kritiek |
| **Ongeautoriseerde toegang** | Onbekende login, verdachte API calls                 | Hoog    |
| **Service verstoring**       | Platform down, data corruption                       | Hoog    |
| **Verdachte activiteit**     | Ongewone zoekpatronen, onbekende webhook calls       | Midden  |
| **Vulnerability ontdekt**    | Security bug gevonden maar niet misbruikt            | Laag    |

---

## Stap 2: Directe acties (eerste 30 minuten)

### Bij data lek of ongeautoriseerde toegang (kritiek/hoog)

1. **Beperk de schade**
   - Roteer de betrokken credentials (zie `credentials.md` voor procedure)
   - Blokkeer verdachte IP/sessie indien mogelijk
   - Schakel de getroffen endpoint uit als dat kan zonder platform-uitval

2. **Documenteer**
   - Wat is er gebeurd? (zo specifiek mogelijk)
   - Wanneer ontdekt? Door wie?
   - Welke data is mogelijk geraakt?
   - Welke klant(en) zijn betrokken?

3. **Informeer intern**
   - Bel Stef (technisch) + Wouter (klantcommunicatie)
   - Deel de documentatie uit stap 2

### Bij service verstoring (hoog)

1. Check Vercel dashboard voor deployment status
2. Check Supabase dashboard voor database status
3. Check Fireflies/Anthropic/Cohere status pages
4. Documenteer wat er mis is en wanneer het begon

### Bij verdachte activiteit of vulnerability (midden/laag)

1. Documenteer de bevinding
2. Beoordeel of directe actie nodig is
3. Plan de fix in de eerstvolgende sprint

---

## Stap 3: Klantcommunicatie

### Wanneer communiceren?

| Situatie                                   | Communicatie vereist? | Tijdlijn             |
| ------------------------------------------ | --------------------- | -------------------- |
| Klantdata is gelekt of mogelijk gelekt     | Ja, verplicht         | Binnen 24 uur        |
| Klantservice was verstoord                 | Ja                    | Binnen 48 uur        |
| Vulnerability gevonden maar niet misbruikt | Optioneel             | Bij volgende contact |
| Interne data betreft alleen ons eigen team | Nee                   | —                    |

### Wie communiceert?

- **Wouter** is eerste aanspreekpunt voor klantcommunicatie
- **Stef** levert technische input voor de communicatie

### Template klantcommunicatie

> Beste [naam],
>
> We informeren jullie over een beveiligingsincident dat op [datum] is ontdekt.
>
> **Wat is er gebeurd:** [korte beschrijving]
>
> **Welke data is betrokken:** [specifiek benoemen]
>
> **Wat hebben we gedaan:** [genomen maatregelen]
>
> **Wat doen we om herhaling te voorkomen:** [structurele verbeteringen]
>
> We nemen dit zeer serieus en staan open voor vragen.
>
> Met vriendelijke groet,
> Wouter van den Heuvel
> JouwAiPartner

---

## Stap 4: Root cause analysis

Na het beheersen van het incident:

1. **Timeline:** Maak een chronologisch overzicht van wat er is gebeurd
2. **Root cause:** Wat was de onderliggende oorzaak?
3. **Impact:** Welke data/gebruikers/klanten zijn geraakt?
4. **Fix:** Wat is er gedaan om het probleem op te lossen?
5. **Preventie:** Welke structurele verbeteringen voorkomen herhaling?

Documenteer dit in `docs/security/incidents/[datum]-[korte-beschrijving].md`.

---

## Stap 5: Follow-up

- [ ] Root cause analysis afgerond
- [ ] Structurele fix geimplementeerd
- [ ] Klant geinformeerd (indien van toepassing)
- [ ] Incident gedocumenteerd in `docs/security/incidents/`
- [ ] Audit report bijgewerkt
- [ ] Team gebrieft over geleerde lessen
- [ ] Credentials geroteerd (indien van toepassing)

---

## AVG/GDPR meldplicht

Bij een datalek met persoonsgegevens:

- **Autoriteit Persoonsgegevens:** Melding binnen 72 uur na ontdekking
- **Betrokkenen:** Informeren als het lek waarschijnlijk een hoog risico oplevert
- **Meldformulier:** https://autoriteitpersoonsgegevens.nl/meldplicht-datalekken
- **Verantwoordelijke voor melding:** Wouter van den Heuvel

> **Let op:** Dit is een vereenvoudigd protocol. Bij groei richting grotere klanten of meer data moet dit protocol worden uitgebreid met een Data Protection Officer (DPO) en formele AVG-procedures.
