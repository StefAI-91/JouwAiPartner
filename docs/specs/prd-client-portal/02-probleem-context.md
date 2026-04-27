# 2. Probleem & Context

## Het probleem

Stefan Roevros (project manager Cai Automations) ontving van JAIP drie verschillende documenten met tegenstrijdige informatie over bugs en voortgang. Zijn letterlijke klacht in de meeting van 23 april 2026: "Ik kan niet deze informatie op dit niveau vinden in DevHub." Dit veroorzaakt vertrouwensschade en kost beide partijen tijd in afstemming.

## Huidige situatie

- JAIP-team werkt in DevHub (intern issue-tracker) en Cockpit (intern dashboard)
- Klant krijgt updates via wekelijkse exports, Notion-documenten en Slack-berichten
- Geen consistente bron — verschillende personen sturen verschillende formats
- Klant ziet alle interne issues niet, maar krijgt ook geen gestructureerd overzicht

## Impact

- **Vertrouwensverlies**: Stefan stuurt aan op "Champions League niveau" en wordt ongeduldig bij inconsistenties
- **Tijdverlies**: JAIP-team genereert handmatig rapportages per week
- **Risico op verkeerde keuzes**: door tegenstrijdige info weten klanten niet wat de echte status is
- **Schaalprobleem**: deze workflow werkt niet als JAIP meer dan 5-6 actieve klanten heeft

## Waarom de huidige oplossing niet voldoet

Wekelijkse exports zijn (a) altijd al verouderd op het moment van versturen, (b) niet bidirectioneel (klant kan niet reageren), en (c) tijdsintensief om handmatig samen te stellen.

## Beoogde feedbackloop (overgenomen uit `portal-mvp.md`)

```
1. JAIP levert op → DevHub issue status update
2. Klant opent portal → ziet voortgang in vier-bucket dashboard
3. Klant bekijkt issues → ziet status van eerdere meldingen
4. JAIP-admin markeert relevante issues als client_visible (handmatig of via label-regel)
5. Klant ziet nieuwe of bijgewerkte issues bij volgend bezoek
6. v2: klant geeft feedback / vraagt om voting / tekent af op delivery
→ Loop herhaalt
```

In v1 is de feedbackloop nog éénrichtingsverkeer (read-only). Bidirectionaliteit (feedback-formulier, comments, voting) volgt in v2.
