# Context per type visualisatie

Verzamel deze informatie voordat je begint met bouwen. Sla vragen over waarvan je het antwoord al weet uit de conversatie of project-docs.

## 🧩 Component

- Welk component? (bijv. "een leads tabel met zoekbalk en filters")
- Welke data toont het? (kolommen, velden)
- Welke acties kan de gebruiker doen? (klikken, sorteren, filteren)
- Welke states zijn er? (loading, empty, error, filled)

## 📄 Pagina / Feature

- Welke pagina? (bijv. "het dashboard na inloggen")
- Welke componenten staan erop?
- Welke rol/gebruiker ziet dit scherm?
- Is er een sidebar, navigatie, header?

## 🔀 Flow / Proces

- Wat is het startpunt? (bijv. "gebruiker klikt op 'Nieuwe lead'")
- Wat is het eindpunt? (bijv. "lead is opgeslagen en zichtbaar in de tabel")
- Zijn er beslismomenten? (bijv. "als email al bestaat → foutmelding")
- Welke schermen doorloopt de gebruiker?

## 📊 Datamodel

- Welke tabellen? (of: lees uit project docs als beschikbaar)
- Welke relaties? (one-to-many, many-to-many)
- Welke belangrijke constraints of RLS policies?

## 🏗️ Architectuur

- Welke systemen zijn er? (frontend, API, database, externe services)
- Hoe communiceren ze? (REST, webhooks, real-time, cron)
- Welke externe services? (Supabase, Resend, Apify, Stripe, etc.)

## 🔄 State diagram

- Welk object of feature? (bijv. "een audit met status")
- Welke toestanden? (concept, in_review, goedgekeurd, afgekeurd)
- Welke acties veroorzaken transities?
- Wie mag welke transitie uitvoeren? (rollen/permissies)
