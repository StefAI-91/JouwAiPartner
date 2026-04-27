# 8. Niet-functionele Eisen

## Beveiliging

- Magic link OTP via Supabase Auth (geen wachtwoorden)
- Sessies via secure HTTP-only cookies
- RLS op alle relevante tabellen (`issues`, `audit_log`, `users`)
- Geen email-enumeration in login-flow
- HTTPS-only via Vercel
- CSP-headers via Next.js middleware
- Rate-limiting op login-endpoint (Supabase built-in)

## Privacy (AVG/GDPR)

- Persoonsgegevens: email-adres en naam van klant-users
- Issues bevatten projectinhoud die gevoelig kan zijn (bijv. zakelijke processen) — RLS voorkomt cross-tenant access
- Bewaartermijn: zolang klant actieve organisatie is + 12 maanden na opzegging
- Recht op inzage/verwijdering: handmatig proces via JAIP-team in v1, geautomatiseerd in v2
- Verwerkersovereenkomst: koppelen aan bestaande JAIP-VWO

## Beschikbaarheid

- Streefuptime: 99% (Vercel + Supabase SLA's bieden hoger, geen formele SLA in v1)
- Backup: Supabase point-in-time recovery (standaard 7 dagen op Pro-tier)
- Fallback bij storing: statuspagina met `status.jouwaipartner.nl` (TBD)

## Logging & monitoring

- Frontend errors via Vercel Analytics
- Backend errors via Supabase logs
- Audit-log voor visibility-changes in eigen tabel
- Geen externe error-tracker in v1 (Sentry overwegen v2)
