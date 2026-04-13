# Micro Sprint DH-018: Magic link login (DevHub + Cockpit)

## Doel

Login wordt omgezet van email + password naar **magic link** (Supabase `signInWithOtp`) voor zowel Cockpit als DevHub. Geen self-signup: users komen enkel het systeem in via een invite (behandeld in DH-019). Bestaande password-users kunnen blijven inloggen via een tijdelijke password-fallback op de DevHub login (gedurende één overgangsperiode), de Cockpit schakelt direct naar magic-link-only. Deze sprint levert de login-pagina's op + de magic-link callback handler.

> **Productie-risico**: bestaande users (Stef, Wouter, Ege) die nu met password inloggen moeten vóór uitrol op de hoogte zijn dat ze voortaan een magic-link ontvangen. Plan deze sprint met een communicatie-moment.

## Requirements

| ID       | Beschrijving                                                                                                                                                                                                                      |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AUTH-170 | DevHub en Cockpit login-pagina accepteert alleen een e-mailadres en verstuurt een magic link via `supabase.auth.signInWithOtp({ email })`.                                                                                        |
| AUTH-171 | Magic link opent een callback-route (`/auth/callback`) die de sessie aanmaakt en doorverwijst: admin → cockpit home, member → devhub home.                                                                                        |
| AUTH-172 | Ongeldige of verlopen magic links tonen een duidelijke foutpagina met een "stuur opnieuw" actie.                                                                                                                                  |
| AUTH-173 | DevHub login ondersteunt tijdelijk password-fallback voor users met bestaand wachtwoord (eenmalig tijdens transitie). Cockpit login is direct magic-link-only.                                                                    |
| AUTH-174 | Er is **geen** self-signup route, self-service password reset of "create account" link. Access begint altijd met invite (DH-019).                                                                                                 |
| AUTH-175 | Sessieduur wordt expliciet geconfigureerd: ingelogde users blijven 30 dagen ingelogd tenzij ze expliciet uitloggen (Supabase project-level setting + documentatie).                                                               |
| UI-160   | Login-formulier bevat: e-mailveld, submit-knop "Stuur magic link", success-state "Check je inbox", error-state. Geen password-veld op cockpit; op devhub gedesactiveerd achter een link "Inloggen met wachtwoord" voor transitie. |
| EDGE-170 | Onbekende e-mail (geen profile / geen auth user) → geen error-leak. Zelfde success-melding ("Check je inbox als je toegang hebt"). Geen magic link verzonden aan onbekende adressen.                                              |
| SEC-180  | De Supabase `emailRedirectTo` URL wordt geconfigureerd met de juiste host per app (`NEXT_PUBLIC_COCKPIT_URL` / `NEXT_PUBLIC_DEVHUB_URL`). Redirect-whitelist staat in Supabase project-settings.                                  |

## Bronverwijzingen

- Scope-afspraken: prompt scope-beslissingen 7 (magic link), 14 (no self-signup)
- Bestaande login forms (password-based):
  - `apps/devhub/src/app/login/login-form.tsx`
  - `apps/devhub/src/app/login/page.tsx`
  - `apps/cockpit/src/app/login/login-form.tsx`
- Supabase client factories: `packages/database/src/supabase/client.ts`, `.../server.ts`
- Dit sprint-bestand nummert door vanaf `DH-017`; de volgende sprint (DH-019) bouwt hierop verder met invite flow

## Context

### Flow

```
User voert email in op /login
    ↓
signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: `${host}/auth/callback` } })
    ↓
Supabase stuurt email met magic link: https://<host>/auth/callback?code=...
    ↓
Callback route wisselt code in voor sessie:
  const { error } = await supabase.auth.exchangeCodeForSession(code)
    ↓
Bij succes: lookup profiles.role
  → admin → redirect NEXT_PUBLIC_COCKPIT_URL (als nu op devhub) of "/"
  → member → redirect NEXT_PUBLIC_DEVHUB_URL (als nu op cockpit) of "/"
```

### shouldCreateUser: false

Dit is cruciaal: zorgt dat magic-link geen nieuwe auth-user aanmaakt voor onbekende e-mails. Users kunnen alleen binnenkomen als de admin hen invitet (DH-019).

### Voorbeeld login-form

```tsx
// apps/cockpit/src/app/login/login-form.tsx (herschreven)
"use client";
import { useState } from "react";
import { z } from "zod";
import { createClient } from "@repo/database/supabase/client";
import { Button } from "@repo/ui/button";

const emailSchema = z.object({ email: z.string().email("Ongeldig e-mailadres") });

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const parsed = emailSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Ongeldig e-mailadres");
      setState("error");
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data.email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    // EDGE-170: toon success ook als Supabase een error gooit op onbekende email
    setState("sent");
  }

  if (state === "sent")
    return <p>Check je inbox! Als dit adres toegang heeft, ontvang je een magic link.</p>;
  return <form onSubmit={handleSubmit}>{/* email input + submit */}</form>;
}
```

### Callback route

```ts
// apps/cockpit/src/app/auth/callback/route.ts
// apps/devhub/src/app/auth/callback/route.ts
import { createClient } from "@repo/database/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { isAdmin } from "@repo/auth/access";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/login?error=missing_code", req.url));
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/login?error=invalid_link", req.url));
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login?error=session", req.url));

  const admin = await isAdmin(user.id);
  if (admin) {
    // in cockpit: "/"; in devhub: redirect to cockpit URL
    return NextResponse.redirect(new URL(process.env.NEXT_PUBLIC_COCKPIT_URL ?? "/", req.url));
  }
  return NextResponse.redirect(new URL(process.env.NEXT_PUBLIC_DEVHUB_URL ?? "/", req.url));
}
```

### DevHub password-fallback (tijdelijk)

Voeg een link "Inloggen met wachtwoord" toe dat een disclosure toont met de oude password-form. Markeer met `<!-- TODO: remove after 2026-05-01 -->` of vergelijkbare hard deadline. Verwijder in een toekomstige sprint of via CLAUDE.md backlog entry.

### Session duration

`supabase.auth` heeft standaard 1 uur access-token + 1 week refresh. Voor 30 dagen verleng je de refresh-token window in Supabase dashboard → Project → Auth → Configuration. Niet via code — documenteer dit in `docs/specs/` of in de PR.

### Risico's

- **Productie breaking**: zodra password-login in cockpit uit gaat, werken oude bookmarks + password managers niet meer. Mitigatie: rollout tijdens werkoverleg, iedereen tegelijk opnieuw laten inloggen.
- **Email deliverability**: magic links landen soms in spam. Test met Gmail + Outlook vóór uitrol.
- **CSRF**: Supabase OTP flow is CSRF-safe by design (PKCE code exchange), maar de callback route moet NEXT origin respecteren. Check `emailRedirectTo` whitelist in Supabase.

## Prerequisites

- [x] DH-013: DB fundering (profiles rol weet wie admin is)
- [x] DH-014: Auth helpers (`isAdmin` voor callback routing)
- [x] DH-015: Cockpit admin-check (member-to-devhub redirect werkt)

## Taken

- [ ] Cockpit: herschrijf `apps/cockpit/src/app/login/login-form.tsx` → alleen email + magic link
- [ ] Cockpit: nieuwe route `apps/cockpit/src/app/auth/callback/route.ts`
- [ ] DevHub: herschrijf `apps/devhub/src/app/login/login-form.tsx` → magic link primair, collapsible password-fallback
- [ ] DevHub: nieuwe route `apps/devhub/src/app/auth/callback/route.ts`
- [ ] Env vars: `NEXT_PUBLIC_COCKPIT_URL`, `NEXT_PUBLIC_DEVHUB_URL` documenteren; Supabase redirect-whitelist bijwerken
- [ ] Supabase Project settings: refresh-token duur instellen op 30 dagen (handmatig in dashboard, documenteren in PR)
- [ ] Error page / UI: login pagina toont toaster of banner voor `?error=` query parameters
- [ ] Update `docs/specs/requirements-devhub.md` met AUTH-170..175, UI-160, EDGE-170, SEC-180
- [ ] Communicatie-draft in PR: "Alle users krijgen voortaan een magic link. Password login verdwijnt uit cockpit per [datum]."

## Acceptatiecriteria

- [ ] [AUTH-170] Admin voert email in op cockpit `/login` → ontvangt magic link → klikt → inlogsuccess
- [ ] [AUTH-170] Member voert email in op devhub `/login` → ontvangt magic link → klikt → inlogsuccess
- [ ] [AUTH-171] Admin logt in via devhub magic link → wordt geredirect naar cockpit URL
- [ ] [AUTH-171] Member logt in via cockpit magic link → wordt geredirect naar devhub URL (nadat cockpit-middleware hem afwijst of via callback direct)
- [ ] [AUTH-172] Magic link met geknoeid/verlopen code → toont error banner op login + knop "nieuwe link"
- [ ] [AUTH-173] Bestaand password-user kan op DevHub nog met wachtwoord inloggen (collapsible pad)
- [ ] [AUTH-174] Geen "registreer" of "account aanmaken" link aanwezig in UI
- [ ] [EDGE-170] Onbekend e-mailadres krijgt geen magic link maar ziet dezelfde success-UI
- [ ] [SEC-180] Supabase Auth logs tonen `emailRedirectTo` binnen de whitelist (geconfigureerd)
- [ ] Na succesvolle login blijft sessie 30 dagen actief (handmatig te verifiëren via Supabase dashboard setting)
- [ ] `npm run type-check` en `npm run lint` slagen

## Geraakt door deze sprint

- `apps/cockpit/src/app/login/login-form.tsx` (herschreven)
- `apps/cockpit/src/app/auth/callback/route.ts` (nieuw)
- `apps/devhub/src/app/login/login-form.tsx` (herschreven)
- `apps/devhub/src/app/auth/callback/route.ts` (nieuw)
- `apps/cockpit/src/app/login/page.tsx` (mogelijk kleine UX-update)
- `apps/devhub/src/app/login/page.tsx` (mogelijk kleine UX-update)
- `.env.example` / env-docs (bijgewerkt)
- `docs/specs/requirements-devhub.md` (bijgewerkt)
