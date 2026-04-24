# Deployment

Operationele config voor cockpit + devhub (+ portal, wanneer gedeployed).

## Environment Variables

- `NEXT_PUBLIC_USERBACK_TOKEN` — Userback feedback widget token (required for deployment).
- `NEXT_PUBLIC_COCKPIT_URL` — Full URL naar de cockpit app (productie: `https://jouw-ai-partner.vercel.app`, dev fallback: `http://localhost:3000`). Gebruikt door:
  - workspace-switcher in beide apps voor cross-app navigatie
  - devhub `/auth/callback` om admins na magic-link login naar cockpit te redirecten
  - cockpit middleware voor member-forbidden-redirect
- `NEXT_PUBLIC_DEVHUB_URL` — Full URL naar de devhub app (productie: `https://jouw-ai-partner-devhub.vercel.app`, dev fallback: `http://localhost:3001`). Gebruikt door cockpit callback + middleware om members naar devhub te redirecten + door de workspace-switcher.
- `NEXT_PUBLIC_PORTAL_URL` — Full URL naar de portal app (nog niet gedeployed).

Beide apps (cockpit + devhub) hebben de 3 NEXT*PUBLIC*\* URL vars nodig zodat de workspace-switcher in de sidebar naar de andere quadranten kan linken.

## Supabase dashboard (handmatig, DH-018)

- **Redirect URLs whitelist** (Authentication → URL Configuration) moet beide productie-URL's `${cockpit}/auth/callback` en `${devhub}/auth/callback` bevatten, plus de preview/localhost varianten.
- **JWT / refresh-token**: zet de session refresh duration op **30 dagen** (AUTH-175).
